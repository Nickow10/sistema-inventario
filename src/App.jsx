import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

export default function App() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [nombre, setNombre] = useState("");
  const [sku, setSku] = useState("");
  const [stock, setStock] = useState("0");
  const [minimo, setMinimo] = useState("5");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    let activo = true;

    async function cargar() {
      const { data, error: err } = await supabase
        .from("productos")
        .select("id, nombre, sku, stock, minimo")
        .order("nombre");

      if (!activo) return;
      if (err) {
        setError(err.message);
        setProductos([]);
      } else {
        setError("");
        setProductos(data ?? []);
      }
      setCargando(false);
    }

    cargar();
    return () => {
      activo = false;
    };
  }, []);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    );
  }, [productos, busqueda]);

  async function agregar(e) {
    e.preventDefault();
    const n = nombre.trim();
    const s = sku.trim().toUpperCase();
    if (!n || !s) return;
    if (productos.some((p) => p.sku === s)) return;

    const row = {
      nombre: n,
      sku: s,
      stock: Math.max(0, Number(stock) || 0),
      minimo: Math.max(0, Number(minimo) || 0),
    };

    const { data, error: err } = await supabase
      .from("productos")
      .insert(row)
      .select("id, nombre, sku, stock, minimo")
      .single();

    if (err) {
      setError(err.message);
      return;
    }

    setError("");
    setProductos((prev) => [data, ...prev]);
    setNombre("");
    setSku("");
    setStock("0");
    setMinimo("5");
  }

  async function cambiarStock(id, delta) {
    const actual = productos.find((p) => p.id === id);
    if (!actual) return;
    const stock = Math.max(0, actual.stock + delta);

    const { error: err } = await supabase
      .from("productos")
      .update({ stock })
      .eq("id", id);

    if (err) {
      setError(err.message);
      return;
    }

    setError("");
    setProductos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, stock } : p))
    );
  }

  async function eliminar(id) {
    const { error: err } = await supabase.from("productos").delete().eq("id", id);
    if (err) {
      setError(err.message);
      return;
    }
    setError("");
    setProductos((prev) => prev.filter((p) => p.id !== id));
  }

  const bajos = productos.filter((p) => p.stock <= p.minimo).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-5">
        <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Inventario</h1>
            <p className="text-sm text-slate-400">
              {cargando
                ? "Cargando…"
                : `${productos.length} productos · ${bajos} con stock bajo`}
            </p>
            {error ? (
              <p className="mt-1 text-sm text-rose-400">{error}</p>
            ) : null}
          </div>
          <input
            className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            placeholder="Buscar nombre o SKU"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-6 py-8 lg:grid-cols-[320px_1fr]">
        <form
          onSubmit={agregar}
          className="h-fit space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
        >
          <h2 className="font-medium">Agregar ítem</h2>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            placeholder="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            placeholder="SKU"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-slate-400">
              Stock inicial
              <input
                type="number"
                min="0"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            </label>
            <label className="text-xs text-slate-400">
              Mínimo
              <input
                type="number"
                min="0"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
                value={minimo}
                onChange={(e) => setMinimo(e.target.value)}
              />
            </label>
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400"
          >
            Guardar
          </button>
        </form>

        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/70 text-slate-300">
              <tr>
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    Cargando productos…
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    Sin productos
                  </td>
                </tr>
              ) : (
                filtrados.map((p) => {
                  const bajo = p.stock <= p.minimo;
                  return (
                    <tr key={p.id} className="border-t border-slate-800">
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.nombre}</div>
                        <div className="text-xs text-slate-500">mín. {p.minimo}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400">{p.sku}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            bajo
                              ? "rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-400"
                              : "text-slate-100"
                          }
                        >
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            className="rounded-md border border-slate-700 px-2 py-1 hover:bg-slate-800"
                            onClick={() => cambiarStock(p.id, -1)}
                          >
                            −
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-slate-700 px-2 py-1 hover:bg-slate-800"
                            onClick={() => cambiarStock(p.id, 1)}
                          >
                            +
                          </button>
                          <button
                            type="button"
                            className="rounded-md px-2 py-1 text-rose-400 hover:bg-rose-500/10"
                            onClick={() => eliminar(p.id)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
