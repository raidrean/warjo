const menuData = [
  {
    id: "nasi-gila",
    name: "Nasi Gila",
    category: "Makanan",
    price: 18000,
    image: "img/nasi%20gila.jpg",
    badge: "Terlaris",
    promo: false,
    description: "Nasi goreng spesial dengan telur, ayam, sosis dan sayuran.",
    tags: ["nasi", "favorit", "makanan berat", "best seller"],
    stock: 18,
    extras: [
      { label: "Telur", price: 5000 },
      { label: "Sosis", price: 4000 },
      { label: "Keju", price: 5000 }
    ]
  },
  {
    id: "nasi-goreng",
    name: "Nasi Goreng",
    category: "Makanan",
    price: 15000,
    image: "img/nasi%20goreng.jpg",
    badge: "Terlaris",
    promo: false,
    description: "Nasi goreng khas Warjo dengan bumbu gurih dan rasa yang kuat.",
    tags: ["nasi", "goreng", "makanan", "favorite"],
    stock: 17,
    extras: [
      { label: "Ayam Crispy", price: 7000 },
      { label: "Telur", price: 5000 }
    ]
  },
  {
    id: "mie-bangladesh",
    name: "Mie Bangladesh Original",
    category: "Mie",
    price: 16000,
    image: "img/mie%20bang%20ladesh.jpg",
    badge: "",
    promo: true,
    description: "Mie dengan kuah rempah gurih dan tekstur kenyal yang cocok untuk semua kalangan.",
    tags: ["mie", "bangladesh", "kuah"],
    stock: 12,
    extras: [
      { label: "Bakso", price: 6000 },
      { label: "Telur", price: 4000 }
    ]
  },
  {
    id: "mie-dokdok",
    name: "Mie Dok-Dok",
    category: "Mie",
    price: 13000,
    image: "img/Mie%20Dok%20dok.jpg",
    badge: "",
    promo: false,
    description: "Mie khas dengan cita rasa khas Warjo dan topping sedap.",
    tags: ["mie", "dok dok", "pedas"],
    stock: 16,
    extras: [
      { label: "Ceker", price: 8000 },
      { label: "Pangsit", price: 5000 }
    ]
  },
  {
    id: "nasi-ayam-bali",
    name: "Nasi Ayam Bumbu Bali",
    category: "Makanan",
    price: 18000,
    image: "img/nasi%20ayam%20bumbu%20bali.jpg",
    badge: "",
    promo: false,
    description: "Nasi ayam bumbu Bali dengan sensasi pedas segar yang menggugah selera.",
    tags: ["nasi", "ayam", "bali", "pedas"],
    stock: 14,
    extras: [
      { label: "Es Teh", price: 3000 },
      { label: "Kerupuk", price: 2000 }
    ]
  },
  {
    id: "kopi-susu-warjo",
    name: "Kopi Susu WARJO",
    category: "Minuman",
    price: 15000,
    image: "https://pesanwarjo.com/storage/menu/v9TyOKaFeY4wVWrAYJhZcFXtq9JfShmH95cZigS7.jpg",
    badge: "Terlaris",
    promo: false,
    description: "Kopi susu dengan rasa lembut, creamy dan paduan manis yang cocok untuk menemani santap.",
    tags: ["kopi", "susu", "minuman", "best seller"],
    stock: 24,
    extras: [
      { label: "Espresso tambahan", price: 4000 },
      { label: "Kocok es", price: 2000 }
    ]
  },
  {
    id: "kopi-susu-gamprit",
    name: "Kopi Susu Gamprit",
    category: "Minuman",
    price: 12000,
    image: "img/kopi%20susu%20gamprit%20(gula%20aren).jpg",
    badge: "",
    promo: true,
    description: "Minuman kopi susu dengan gula aren yang lembut dan aroma khas.",
    tags: ["kopi", "susu", "gula aren", "minuman"],
    stock: 20,
    extras: [
      { label: "Es batu", price: 1000 },
      { label: "Pudding", price: 3000 }
    ]
  },
  {
    id: "max-tea-lemon",
    name: "Max Tea Lemon",
    category: "Minuman",
    price: 6000,
    image: "https://pesanwarjo.com/storage/menu/iimg4YY2cbbUgMEYdZaWqqc6k7gcBwt7TnW7jX28.jpg",
    badge: "",
    promo: false,
    description: "Teh lemon segar yang menyegarkan dan ringan di siang hari.",
    tags: ["tea", "lemon", "minuman", "segar"],
    stock: 26,
    extras: [
      { label: "Lemon tambahan", price: 2000 },
      { label: "Gula rendah", price: 0 }
    ]
  },
  {
    id: "soda-susu",
    name: "Soda Susu",
    category: "Minuman",
    price: 10000,
    image: "https://pesanwarjo.com/storage/menu/M7DU7Ysl5TcavRFycc7cY80kjcJUbKhlJtJGTNUR.jpg",
    badge: "",
    promo: false,
    description: "Minuman susu segar dengan sensasi soda yang ringan dan menyenangkan.",
    tags: ["soda", "susu", "minuman", "anak muda"],
    stock: 10,
    extras: [
      { label: "Es batu", price: 1000 }
    ]
  },
  {
    id: "pancong",
    name: "Pancong",
    category: "Snack",
    price: 7000,
    image: "https://pesanwarjo.com/storage/menu/fpVW60lbioLTotNJ20mhcQDoW0sB20qSB72vkcwn.jpg",
    badge: "",
    promo: false,
    description: "Snack tradisional dengan rasa manis yang hangat dan renyah.",
    tags: ["pancong", "snack", "tradisional"],
    stock: 15,
    extras: [
      { label: "Keju", price: 3000 },
      { label: "Coklat", price: 3000 }
    ]
  },
  {
    id: "pancong-lotus",
    name: "Pancong Lotus Biscoff",
    category: "Snack",
    price: 12000,
    image: "https://pesanwarjo.com/storage/menu/SDsg79qx3mW7YU8P30RYZKDfGBV6pCGTBsQCVFal.jpg",
    badge: "",
    promo: false,
    description: "Versi premium pancong yang kaya rasa dan cocok untuk camilan santai.",
    tags: ["pancong", "lotus", "snack", "premium"],
    stock: 9,
    extras: [
      { label: "Keju", price: 4000 }
    ]
  },
  {
    id: "roti-pisang",
    name: "Roti Pisang Bakar Cokelat Keju",
    category: "Dessert",
    price: 23000,
    image: "https://pesanwarjo.com/storage/menu/BoXZTFgncfzJg7BQqZpcHyZHOJ7BhgFr4dSZJCfA.jpg",
    badge: "",
    promo: false,
    description: "Roti pisang bakar dengan campuran cokelat dan keju yang manis gurih.",
    tags: ["roti", "pisang", "dessert", "coklat"],
    stock: 8,
    extras: [
      { label: "Keju ekstra", price: 5000 },
      { label: "Coklat ekstra", price: 5000 }
    ]
  },
  {
    id: "nasi-goreng-gila",
    name: "Nasi Goreng Gila",
    category: "Makanan",
    price: 18000,
    image: "img/nasi%20goreng%20gila.jpg",
    badge: "",
    promo: false,
    description: "Nasi goreng dengan topping lengkap dan rasa gurih yang menggugah selera.",
    tags: ["nasi", "goreng", "makanan berat"],
    stock: 15,
    extras: [
      { label: "Telur", price: 5000 },
      { label: "Kerupuk", price: 2000 }
    ]
  },
  {
    id: "nasi-ayam-kari",
    name: "Nasi Ayam Kari",
    category: "Makanan",
    price: 18000,
    image: "img/nasi%20ayam%20kari.jpg",
    badge: "",
    promo: false,
    description: "Nasi dengan ayam berbumbu kari yang gurih dan kaya rempah.",
    tags: ["nasi", "ayam", "kari", "makanan berat"],
    stock: 14,
    extras: [
      { label: "Telur", price: 5000 },
      { label: "Kerupuk", price: 2000 }
    ]
  },
  {
    id: "kopi-susu-jatiwaringin",
    name: "Kopi Susu Jatiwaringin",
    category: "Minuman",
    price: 15000,
    image: "img/kopi%20susu%20jatiwaringin%20(salted%20caramel).jpg",
    badge: "",
    promo: false,
    description: "Kopi susu dengan rasa salted caramel yang lembut dan seimbang.",
    tags: ["kopi", "susu", "salted caramel", "minuman"],
    stock: 18,
    extras: [
      { label: "Es batu", price: 1000 }
    ]
  },
  {
    id: "extra-joss-susu",
    name: "Extra Joss Susu",
    category: "Minuman",
    price: 8000,
    image: "img/extra%20joss%20susu.png",
    badge: "",
    promo: false,
    description: "Minuman segar dengan perpaduan Extra Joss dan susu.",
    tags: ["extra joss", "susu", "minuman"],
    stock: 20,
    extras: [
      { label: "Es batu", price: 1000 }
    ]
  },
  {
    id: "kulit-sambal-matah",
    name: "Kulit Sambal Matah",
    category: "Snack",
    price: 15000,
    image: "img/kulit%20sambal%20matah.jpg",
    badge: "",
    promo: false,
    description: "Kulit renyah dengan sambal matah yang segar dan pedas.",
    tags: ["kulit", "sambal matah", "snack", "pedas"],
    stock: 12,
    extras: [
      { label: "Sambal tambahan", price: 3000 }
    ]
  },
  {
    id: "tahu-cabe-garam",
    name: "Tahu Cabe Garam",
    category: "Snack",
    price: 12000,
    image: "img/tahu%20cabe%20garam.jpg",
    badge: "",
    promo: false,
    description: "Tahu goreng renyah dengan taburan cabe dan garam gurih.",
    tags: ["tahu", "cabe", "snack", "gurih"],
    stock: 16,
    extras: [
      { label: "Sambal tambahan", price: 3000 }
    ]
  },
  {
    id: "omelette",
    name: "Omelette",
    category: "Makanan",
    price: 15000,
    image: "img/omellete.jpg",
    badge: "",
    promo: false,
    description: "Telur omelette lembut yang cocok sebagai lauk tambahan.",
    tags: ["telur", "omelette", "makanan"],
    stock: 15,
    extras: [
      { label: "Keju", price: 3000 }
    ]
  },
  {
    id: "warjo-platter",
    name: "Warjo Platter",
    category: "Makanan",
    price: 30000,
    image: "img/warjo%20platter.jpg",
    badge: "",
    promo: false,
    description: "Sajian lengkap Warjo dengan nasi, lauk, dan pelengkap.",
    tags: ["platter", "nasi", "makanan berat"],
    stock: 10,
    extras: [
      { label: "Telur", price: 5000 },
      { label: "Sambal tambahan", price: 3000 }
    ]
  }
];
