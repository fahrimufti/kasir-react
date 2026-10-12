import { useEffect, useMemo, useReducer, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import "./App.css";

const rp = (n) => "Rp " + new Intl.NumberFormat("id-ID").format(n);
const dayKey = (d) => new Date(d).toLocaleDateString("en-CA");

const SEED = [
  { id: 1, name: "Teh botol", category: "Minuman", price: 5000 },
  { id: 2, name: "Teh kotak", category: "Minuman", price: 4000 },
  { id: 3, name: "Air mineral", category: "Minuman", price: 2000 },
  { id: 4, name: "Nabati wafer", category: "Snack", price: 2000 },
  { id: 5, name: "Pilus", category: "Snack", price: 1000 },
  { id: 6, name: "Chiki", category: "Snack", price: 2000 },
];

// localStorage helper: data tetap ada walau halaman di-refresh
function useStored(key, fallback) {
  const [v, setV] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  });
  useEffect(() => localStorage.setItem(key, JSON.stringify(v)), [key, v]);
  return [v, setV];
}

// Keranjang: item disalin (nama + harga) supaya struk lama tidak berubah kalau menu diedit
function cartReducer(state, a) {
  switch (a.type) {
    case "add": {
      const found = state.find((i) => i.id === a.p.id);
      return found
        ? state.map((i) => (i.id === a.p.id ? { ...i, qty: i.qty + 1 } : i))
        : [...state, { id: a.p.id, name: a.p.name, price: a.p.price, qty: 1 }];
    }
    case "inc":
      return state.map((i) => (i.id === a.id ? { ...i, qty: i.qty + 1 } : i));
    case "dec":
      return state
        .map((i) => (i.id === a.id ? { ...i, qty: i.qty - 1 } : i))
        .filter((i) => i.qty > 0);
    case "clear":
      return [];
    default:
      return state;
  }
}

function Modal({ title, onClose, children }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

function Switch({ checked, onChange, label }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      className={"switch" + (checked ? " on" : "")}
      onClick={() => onChange(!checked)}
    >
      <span className="track">
        <span className="knob" />
      </span>
      {label}
    </button>
  );
}

function ProductForm({ product, onSave, onDelete, onClose }) {
  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [price, setPrice] = useState(product?.price ?? "");
  const valid = name.trim() && Number(price) > 0;
  return (
    <Modal title={product ? "Edit menu" : "Tambah menu"} onClose={onClose}>
      <label>
        Nama
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </label>
      <label>
        Kategori
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Minuman, Snack, ..."
        />
      </label>
      <label>
        Harga (Rp)
        <input
          type="number"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </label>
      <div className="row end">
        {product && (
          <button
            className="btn danger"
            onClick={() =>
              window.confirm(`Hapus "${product.name}"?`) && onDelete(product.id)
            }
          >
            Hapus
          </button>
        )}
        <button className="btn ghost" onClick={onClose}>
          Batal
        </button>
        <button
          className="btn primary"
          disabled={!valid}
          onClick={() =>
            onSave({
              ...product,
              name: name.trim(),
              category: category.trim() || "Lainnya",
              price: Number(price),
            })
          }
        >
          Simpan
        </button>
      </div>
    </Modal>
  );
}

function PaymentModal({ total, onPay, onClose }) {
  const [method, setMethod] = useState("cash");
  const [received, setReceived] = useState("");
  const money = Number(received) || 0;
  const quick = [
    ...new Set([total, 10000, 20000, 50000, 100000].filter((n) => n >= total)),
  ].slice(0, 4);
  const canPay = method === "qris" || money >= total;
  return (
    <Modal title="Pembayaran" onClose={onClose}>
      <div className="row between big">
        <span>Total</span>
        <strong>{rp(total)}</strong>
      </div>
      <div className="seg">
        <button
          className={method === "cash" ? "active" : ""}
          onClick={() => setMethod("cash")}
        >
          Cash
        </button>
        <button
          className={method === "qris" ? "active" : ""}
          onClick={() => setMethod("qris")}
        >
          QRIS
        </button>
      </div>
      {method === "cash" ? (
        <>
          <label>
            Uang diterima
            <input
              type="number"
              min="0"
              value={received}
              onChange={(e) => setReceived(e.target.value)}
              autoFocus
            />
          </label>
          <div className="chips">
            {quick.map((n) => (
              <button
                key={n}
                className="chip"
                onClick={() => setReceived(String(n))}
              >
                {n === total ? "Uang pas" : rp(n)}
              </button>
            ))}
          </div>
          <div className="row between">
            <span>Kembalian</span>
            <strong>{money >= total ? rp(money - total) : "-"}</strong>
          </div>
        </>
      ) : (
        <div className="qr">
          {/* Ganti dengan gambar QRIS tokomu: <img src="/qris.png" /> */}
          <QRCodeSVG value={`DEMO-QRIS|TOTAL=${total}`} size={180} />
          <p>Minta pelanggan scan, cek uang masuk di HP, lalu tekan proses.</p>
        </div>
      )}
      <div className="row end">
        <button className="btn ghost" onClick={onClose}>
          Batal
        </button>
        <button
          className="btn primary"
          disabled={!canPay}
          onClick={() =>
            onPay({ method, received: method === "cash" ? money : total })
          }
        >
          Proses pembayaran
        </button>
      </div>
    </Modal>
  );
}

function Receipt({ tx, onClose }) {
  return (
    <Modal title="Struk" onClose={onClose}>
      <p className="muted">
        #{tx.id} · {new Date(tx.date).toLocaleString("id-ID")}
      </p>
      {tx.items.map((i) => (
        <div className="row between" key={i.id}>
          <span>
            {i.name} x{i.qty}
          </span>
          <span>{rp(i.price * i.qty)}</span>
        </div>
      ))}
      <hr />
      <div className="row between">
        <strong>Total</strong>
        <strong>{rp(tx.total)}</strong>
      </div>
      <div className="row between">
        <span>{tx.method === "cash" ? "Cash" : "QRIS"}</span>
        <span>{rp(tx.received)}</span>
      </div>
      {tx.method === "cash" && (
        <div className="row between">
          <span>Kembalian</span>
          <span>{rp(tx.received - tx.total)}</span>
        </div>
      )}
      <div className="row end">
        <button className="btn primary" onClick={onClose}>
          Selesai
        </button>
      </div>
    </Modal>
  );
}

function Dashboard({ txs }) {
  const today = dayKey(new Date());
  const todays = txs.filter((t) => dayKey(t.date) === today);
  const revenue = todays.reduce((s, t) => s + t.total, 0);
  const sold = todays.reduce(
    (s, t) => s + t.items.reduce((a, i) => a + i.qty, 0),
    0,
  );

  const week = useMemo(() => {
    return [...Array(7)].map((_, n) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - n));
      const key = dayKey(d);
      return {
        key,
        label: d.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "2-digit",
        }),
        total: txs
          .filter((t) => dayKey(t.date) === key)
          .reduce((s, t) => s + t.total, 0),
      };
    });
  }, [txs]);
  const max = Math.max(1, ...week.map((w) => w.total));

  const top = useMemo(() => {
    const m = {};
    txs.forEach((t) =>
      t.items.forEach((i) => {
        m[i.name] = (m[i.name] || 0) + i.qty;
      }),
    );
    return Object.entries(m)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [txs]);

  return (
    <div className="page">
      <h1>Dashboard</h1>
      <div className="stats">
        <div className="panel">
          <span className="muted">Transaksi hari ini</span>
          <strong>{todays.length}</strong>
        </div>
        <div className="panel">
          <span className="muted">Pendapatan hari ini</span>
          <strong>{rp(revenue)}</strong>
        </div>
        <div className="panel">
          <span className="muted">Item terjual</span>
          <strong>{sold}</strong>
        </div>
      </div>
      <div className="two">
        <div className="panel">
          <h3>Pendapatan mingguan</h3>
          <div className="bars">
            {week.map((w) => (
              <div key={w.key} className="bar">
                <div
                  className="fill"
                  style={{ height: `${(w.total / max) * 100}%` }}
                  title={rp(w.total)}
                />
                <span>{w.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <h3>Menu terlaris</h3>
          {top.length === 0 && (
            <p className="muted">
              Belum ada penjualan. Selesaikan transaksi pertama di halaman
              Kasir.
            </p>
          )}
          <ol>
            {top.map(([name, qty]) => (
              <li key={name}>
                <span>{name}</span>
                <strong>{qty}</strong>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function Kasir({ products, setProducts, onTransaction }) {
  const [cart, dispatch] = useReducer(cartReducer, []);
  const [q, setQ] = useState("");
  const [manage, setManage] = useState(false);
  const [form, setForm] = useState(null); // null | {} (baru) | product (edit)
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const shown = products.filter((p) =>
    p.name.toLowerCase().includes(q.toLowerCase()),
  );

  const save = (p) => {
    setProducts((list) =>
      p.id
        ? list.map((x) => (x.id === p.id ? p : x))
        : [...list, { ...p, id: Date.now() }],
    );
    setForm(null);
  };
  const remove = (id) => {
    setProducts((list) => list.filter((x) => x.id !== id));
    setForm(null);
  };
  const pay = ({ method, received }) => {
    const tx = {
      id: Date.now(),
      date: new Date().toISOString(),
      items: cart,
      total,
      method,
      received,
    };
    onTransaction(tx);
    setReceipt(tx);
    setPaying(false);
    dispatch({ type: "clear" });
  };

  return (
    <div className="kasir">
      <section className="menu">
        <div className="row">
          <input
            className="search"
            placeholder="Cari menu"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <Switch checked={manage} onChange={setManage} label="Mode kelola" />
        </div>
        <div className={"grid" + (manage ? " managing" : "")}>
          {shown.map((p) => (
            <button
              key={p.id}
              className="card"
              onClick={() =>
                manage ? setForm(p) : dispatch({ type: "add", p })
              }
            >
              <strong>{p.name}</strong>
              <span className="muted">{p.category}</span>
              <span className="price">{rp(p.price)}</span>
              {manage && <span className="edit">Edit</span>}
            </button>
          ))}
          {shown.length === 0 && <p className="muted">Menu tidak ditemukan.</p>}
        </div>
      </section>

      <aside className={"order panel" + (manage ? " locked" : "")}>
        <div className="row between">
          <h3>Pesanan</h3>
          <button
            className="btn ghost small"
            onClick={() => dispatch({ type: "clear" })}
            disabled={!cart.length || manage}
          >
            Kosongkan
          </button>
        </div>
        {manage && (
          <p className="notice">
            Mode kelola aktif. Matikan dulu untuk membuat transaksi.
          </p>
        )}
        <div className="items">
          {cart.length === 0 && (
            <p className="muted">Pilih menu di sebelah kiri untuk mulai.</p>
          )}
          {cart.map((i) => (
            <div className="item" key={i.id}>
              <div>
                <strong>{i.name}</strong>
                <span className="muted">
                  {rp(i.price)} x {i.qty}
                </span>
              </div>
              <div className="qty">
                <button
                  disabled={manage}
                  onClick={() => dispatch({ type: "dec", id: i.id })}
                >
                  −
                </button>
                <span>{i.qty}</span>
                <button
                  disabled={manage}
                  onClick={() => dispatch({ type: "inc", id: i.id })}
                >
                  +
                </button>
              </div>
              <strong>{rp(i.price * i.qty)}</strong>
            </div>
          ))}
        </div>
        <div className="row between big">
          <span>Total</span>
          <strong>{rp(total)}</strong>
        </div>
        <button
          className="btn primary wide"
          disabled={!cart.length || manage}
          onClick={() => setPaying(true)}
        >
          Bayar
        </button>
      </aside>

      {form && (
        <ProductForm
          product={form.id ? form : null}
          onSave={save}
          onDelete={remove}
          onClose={() => setForm(null)}
        />
      )}
      {paying && (
        <PaymentModal
          total={total}
          onPay={pay}
          onClose={() => setPaying(false)}
        />
      )}
      {receipt && <Receipt tx={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("kasir");
  const [products, setProducts] = useStored("kasir:products", SEED);
  const [txs, setTxs] = useStored("kasir:txs", []);
  const [form, setForm] = useState(null);
  const save = (p) => {
    setProducts((list) =>
      p.id
        ? list.map((x) => (x.id === p.id ? p : x))
        : [...list, { ...p, id: Date.now() }],
    );
    setForm(null);
  };
  const remove = (id) => {
    setProducts((list) => list.filter((x) => x.id !== id));
    setForm(null);
  };

  return (
    <div className="app">
      <nav className="side">
        <div className="brand">Gafari</div>
        {[
          ["dashboard", "Dashboard"],
          ["kasir", "Kasir"],
        ].map(([k, label]) => (
          <button
            key={k}
            className={page === k ? "active" : ""}
            onClick={() => setPage(k)}
          >
            {label}
          </button>
        ))}
        <button onClick={() => setForm({})}>Tambah menu</button>
      </nav>
      <main>
        {page === "dashboard" ? (
          <Dashboard txs={txs} />
        ) : (
          <Kasir
            products={products}
            setProducts={setProducts}
            onTransaction={(t) => setTxs((l) => [...l, t])}
          />
        )}
      </main>
      {form && (
        <ProductForm
          product={form.id ? form : null}
          onSave={save}
          onDelete={remove}
          onClose={() => setForm(null)}
        />
      )}
    </div>
  );
}
