export function Gab() {
    return (
      <div className="h-screen bg-[#f4f6fb] p-3 flex gap-3 overflow-hidden">
        {/* LEFT SIDE */}
        <div className="flex-1 flex flex-col gap-3">
          {/* HEADER */}
          <div className="bg-gradient-to-r from-[#1f2d44] to-[#182438] rounded-[22px] px-6 py-5 flex justify-between items-center shadow-lg">
            {/* LEFT INFO */}
            <div className="flex gap-14 text-white">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/50">
                  Bon N°
                </p>
                <h1 className="text-4xl font-bold mt-1">#002</h1>
              </div>
  
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/50">
                  Vendeur
                </p>
                <h2 className="text-[22px] font-semibold mt-1">
                  Administrateur
                </h2>
              </div>
  
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/50">
                  Date & Heure
                </p>
  
                <p className="text-sm mt-2">17 Juillet 2025 - 14:30</p>
              </div>
            </div>
  
            {/* RIGHT */}
            <div className="flex items-center gap-5">
              <button className="bg-[#26354e] border border-white/10 h-12 px-5 rounded-xl text-white text-sm font-medium">
                ⏸ Mettre en attente
              </button>
  
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-white/50">
                  Total à payer
                </p>
  
                <h1 className="text-[56px] font-bold text-[#ffbf1f] leading-none mt-2">
                  120,00 <span className="text-[24px]">DA</span>
                </h1>
              </div>
            </div>
          </div>
  
          {/* WAITING SALES */}
          <div className="flex gap-3 items-center">
            {/* TITLE */}
            <div className="w-[180px] h-[72px] bg-white rounded-2xl shadow-sm flex items-center justify-center gap-3">
              <span className="text-xl">⏳</span>
  
              <div>
                <p className="text-[10px] text-gray-400 uppercase">
                  Ventes en
                </p>
  
                <h3 className="text-sm font-semibold text-gray-700">Attente</h3>
              </div>
            </div>
  
            {/* CARDS */}
            <div className="flex gap-3">
              {[1, 2, 3].map((item, i) => (
                <div
                  key={item}
                  className={`min-w-[170px] bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm ${
                    i === 0 ? "border-2 border-[#ffd25c]" : ""
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-700">
                    {item}
                  </div>
  
                  <div>
                    <h4 className="font-semibold text-sm text-[#263248]">
                      BON #00{item}
                    </h4>
  
                    <p className="text-xs text-gray-400">
                      14:22 - 45.00 DA
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
  
          {/* CONTENT */}
          <div className="flex-1 flex gap-3 overflow-hidden">
            {/* CART */}
            <div className="w-[35%] bg-white rounded-[22px] p-5 flex flex-col">
              {/* HEAD */}
              <div className="grid grid-cols-[1fr_80px_80px] text-xs text-gray-400 mb-6">
                <span>DÉSIGNATION</span>
                <span>P.U</span>
                <span>TOTAL</span>
              </div>
  
              {/* ITEMS */}
              <div className="flex-1">
                {[1, 2].map((item, i) => (
                  <div
                    key={item}
                    className="grid grid-cols-[1fr_80px_80px] items-center mb-7"
                  >
                    <div>
                      <h3 className="text-[15px] font-semibold text-[#263248]">
                        {i === 0
                          ? "Coca Cola 1L Original"
                          : "Fort Yaourt Nature"}
                      </h3>
  
                      <p className="text-[11px] text-gray-400 mt-1">
                        6135455655
                      </p>
                    </div>
  
                    <span className="text-gray-600 font-medium">100,00</span>
  
                    <span className="text-gray-800 font-bold">100,00</span>
                  </div>
                ))}
              </div>
  
              {/* FOOTER */}
              <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
                <div className="flex gap-6 text-sm text-gray-500">
                  <button>⚖ Balance</button>
                  <button>🏷 Remise</button>
                </div>
  
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 uppercase">
                    Articles
                  </p>
  
                  <h2 className="text-3xl font-bold text-[#1d2940]">02</h2>
                </div>
              </div>
            </div>
  
            {/* PRODUCTS */}
            <div className="flex-1 bg-white rounded-[22px] p-5 flex flex-col overflow-hidden">
              {/* SEARCH */}
              <input
                type="text"
                placeholder="🔍 Rechercher un produit..."
                className="h-12 rounded-xl border border-gray-200 px-4 outline-none focus:ring-2 focus:ring-[#f3d27a]"
              />
  
              {/* TABS */}
              <div className="mt-4 bg-[#f5f7fb] rounded-xl p-1 flex">
                <button className="flex-1 h-10 rounded-lg bg-white text-[#1f2b42] font-semibold text-sm shadow-sm">
                  ⭐ FAVORIS
                </button>
  
                <button className="flex-1 h-10 rounded-lg text-gray-500 font-semibold text-sm">
                  📦 STOCK
                </button>
              </div>
  
              {/* PRODUCTS GRID */}
              <div className="grid grid-cols-3 gap-4 mt-5 overflow-auto pr-1">
                {[
                  {
                    name: "Café Express",
                    price: "45,00 DA",
                    color: "bg-orange-100 text-orange-500",
                    icon: "☕",
                  },
                  {
                    name: "Eau Minérale 0.5L",
                    price: "25,00 DA",
                    color: "bg-blue-100 text-blue-500",
                    icon: "🥤",
                    active: true,
                  },
                  {
                    name: "Pain Maison",
                    price: "15,00 DA",
                    color: "bg-red-100 text-red-500",
                    icon: "🍞",
                  },
                  {
                    name: "Sandwich Mixte",
                    price: "250,00 DA",
                    color: "bg-green-100 text-green-500",
                    icon: "🥗",
                  },
                  {
                    name: "Glace Vanille",
                    price: "80,00 DA",
                    color: "bg-purple-100 text-purple-500",
                    icon: "🍦",
                  },
                  {
                    name: "Burger Classic",
                    price: "350,00 DA",
                    color: "bg-yellow-100 text-yellow-500",
                    icon: "🍔",
                  },
                  {
                    name: "Jus Frais",
                    price: "120,00 DA",
                    color: "bg-cyan-100 text-cyan-500",
                    icon: "🍸",
                  },
                  {
                    name: "Muffin Choco",
                    price: "100,00 DA",
                    color: "bg-pink-100 text-pink-500",
                    icon: "🧁",
                  },
                  {
                    name: "Omelette",
                    price: "150,00 DA",
                    color: "bg-indigo-100 text-indigo-500",
                    icon: "💧",
                  },
                ].map((product, i) => (
                  <div
                    key={i}
                    className={`border rounded-2xl p-5 text-center cursor-pointer transition hover:-translate-y-1 ${
                      product.active
                        ? "border-2 border-[#f3d27a]"
                        : "border-gray-200"
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center text-xl mb-4 ${product.color}`}
                    >
                      {product.icon}
                    </div>
  
                    <h3 className="text-sm font-semibold text-[#243046]">
                      {product.name}
                    </h3>
  
                    <p className="text-[#ff9b21] font-bold text-sm mt-2">
                      {product.price}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
  
        {/* RIGHT ACTION BAR */}
        <div className="w-[92px] flex flex-col gap-3">
          <button className="h-[74px] rounded-2xl bg-[#ffb020] text-white shadow-sm text-2xl flex flex-col items-center justify-center">
            🧾
          </button>
  
          <button className="h-[74px] rounded-2xl bg-[#ff4d67] text-white shadow-sm flex flex-col items-center justify-center gap-1">
            <span className="text-xl">✕</span>
            <span className="text-[10px] font-semibold">ANNULER</span>
          </button>
  
          <button className="h-[74px] rounded-2xl bg-[#2ecc71] text-white shadow-sm flex flex-col items-center justify-center gap-1">
            <span className="text-xl">✓</span>
            <span className="text-[10px] font-semibold">VALIDER</span>
          </button>
  
          {["🖨 REÇU", "👤 CLIENT", "🕘 JOURNAL", "⏸ ATTENTE"].map(
            (item, i) => (
              <button
                key={i}
                className="h-[74px] rounded-2xl bg-white text-gray-500 shadow-sm flex flex-col items-center justify-center gap-1"
              >
                <span className="text-lg">{item.split(" ")[0]}</span>
  
                <span className="text-[10px] font-semibold">
                  {item.split(" ")[1]}
                </span>
              </button>
            )
          )}
  
          <button className="mt-auto h-[70px] rounded-2xl bg-white text-2xl shadow-sm">
            ⚙️
          </button>
        </div>
      </div>
    );
  }