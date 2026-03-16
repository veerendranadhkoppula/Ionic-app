export type FilterNode = string[] | { [subKey: string]: string[] };

export interface Product {
  id: number;
  name: string;
  tagline: string;
  category: string;
  price: number;
  discountedPrice?: number;
  image: string;
  isOffer?: boolean;
  isOutOfStock?: boolean;

  description?: string;   

  details?: {           
    label: string;
    value: string;
  }[];

  filters?: { [key: string]: FilterNode };
}

export const products: Product[] = [



  {
    id: 1,
    name: "Indonesia Gayo",
    tagline: "Citrus, chocolate, nutty",
    category: "Coffee Beans",
    price: 65,
    discountedPrice: 55,
    image: "/images/1.png",
    isOffer: true,
    description:
    "A high-altitude heirloom from Guji, bright and expressive with floral lift and stone-fruit sweetness.",

  details: [
    { label: "Altitude", value: "2,000–2,200 m" },
    { label: "Process", value: "Washed" },
    { label: "Roast", value: "Medium" },
    { label: "Body", value: "Silky" },
    { label: "Aroma", value: "Floral & citrus" }
  ],
    filters: {
      brew: ["filter", "espresso"],
      origin: ["indonesia"],
      process: ["washed"],
      tastingProfile: {
        acidity: ["bright"],
        body: ["medium"],
        flavor: ["citrus", "chocolate"]
      }
    }
  },

  {
    id: 2,
    name: "Colombia Supremo",
    tagline: "Caramel, smooth",
    category: "Coffee Beans",
    price: 68,
    image: "/images/1.png",
    description:
    "A high-altitude heirloom from Guji, bright and expressive with floral lift and stone-fruit sweetness.",

  details: [
    { label: "Altitude", value: "2,000–2,200 m" },
    { label: "Process", value: "Washed" },
    { label: "Roast", value: "Medium" },
    { label: "Body", value: "Silky" },
    { label: "Aroma", value: "Floral & citrus" }
  ],
    filters: {
      brew: ["espresso"],
      origin: ["colombia"],
      process: ["natural"],
      tastingProfile: {
        acidity: ["medium"],
        body: ["full"],
        flavor: ["caramel"]
      }
    }
  },

  {
    id: 3,
    name: "Ethiopia Yirgacheffe",
    tagline: "Floral, tea-like",
    category: "Coffee Beans",
    price: 72,
    image: "/images/1.png",
    description:
    "A high-altitude heirloom from Guji, bright and expressive with floral lift and stone-fruit sweetness.",

  details: [
    { label: "Altitude", value: "2,000–2,200 m" },
    { label: "Process", value: "Washed" },
    { label: "Roast", value: "Medium" },
    { label: "Body", value: "Silky" },
    { label: "Aroma", value: "Floral & citrus" }
  ],
    filters: {
      brew: ["filter"],
      origin: ["ethiopia"],
      process: ["washed"],
      tastingProfile: {
        acidity: ["bright"],
        body: ["light"],
        flavor: ["floral"]
      }
    }
  },
   {
    id: 4,
    name: "Ethiopia Yirgacheffe",
    tagline: "Floral, tea-like",
    category: "Coffee Beans",
    price: 72,
    image: "/images/1.png",
    description:
    "A high-altitude heirloom from Guji, bright and expressive with floral lift and stone-fruit sweetness.",

  details: [
    { label: "Altitude", value: "2,000–2,200 m" },
    { label: "Process", value: "Washed" },
    { label: "Roast", value: "Medium" },
    { label: "Body", value: "Silky" },
    { label: "Aroma", value: "Floral & citrus" }
  ],
    filters: {
      brew: ["filter"],
      origin: ["ethiopia"],
      process: ["washed"],
      tastingProfile: {
        acidity: ["bright"],
        body: ["light"],
        flavor: ["floral"]
      }
    }
  },
  {
    id: 5,
    name: "Ethiopia Yirgacheffe",
    tagline: "Floral, tea-like",
    category: "Coffee Beans",
    price: 72,
    image: "/images/1.png",
    description:
    "A high-altitude heirloom from Guji, bright and expressive with floral lift and stone-fruit sweetness.",

  details: [
    { label: "Altitude", value: "2,000–2,200 m" },
    { label: "Process", value: "Washed" },
    { label: "Roast", value: "Medium" },
    { label: "Body", value: "Silky" },
    { label: "Aroma", value: "Floral & citrus" }
  ],
    filters: {
      brew: ["filter"],
      origin: ["ethiopia"],
      process: ["washed"],
      tastingProfile: {
        acidity: ["bright"],
        body: ["light"],
        flavor: ["floral"]
      }
    }
  },


  {
    id: 6,
    name: "Signature Drip",
    tagline: "Fruity & bright",
    category: "Drip Bags",
    price: 45,
    image: "/images/1.png",
    description:
    "A high-altitude heirloom from Guji, bright and expressive with floral lift and stone-fruit sweetness.",

  details: [
    { label: "Altitude", value: "2,000–2,200 m" },
    { label: "Process", value: "Washed" },
    { label: "Roast", value: "Medium" },
    { label: "Body", value: "Silky" },
    { label: "Aroma", value: "Floral & citrus" }
  ],
    filters: {
      brew: ["drip"],
      dripProfile: {
        flavor: ["fruity"],
        intensity: ["medium"]
      }
    }
  },

  {
    id: 7,
    name: "Classic Drip",
    tagline: "Balanced everyday cup",
    category: "Drip Bags",
    price: 40,
    image: "/images/1.png",
    description:
    "A high-altitude heirloom from Guji, bright and expressive with floral lift and stone-fruit sweetness.",

  details: [
    { label: "Altitude", value: "2,000–2,200 m" },
    { label: "Process", value: "Washed" },
    { label: "Roast", value: "Medium" },
    { label: "Body", value: "Silky" },
    { label: "Aroma", value: "Floral & citrus" }
  ],
    filters: {
      brew: ["drip"],
      dripProfile: {
        flavor: ["balanced"],
        intensity: ["light"]
      }
    }
  },

  /* ---------------- CAPSULES ---------------- */

  {
    id: 8,
    name: "Capsule Strong",
    tagline: "Dark & bold",
    category: "Capsules",
    price: 50,
    image: "/images/1.png",
    description:
    "A high-altitude heirloom from Guji, bright and expressive with floral lift and stone-fruit sweetness.",

  details: [
    { label: "Altitude", value: "2,000–2,200 m" },
    { label: "Process", value: "Washed" },
    { label: "Roast", value: "Medium" },
    { label: "Body", value: "Silky" },
    { label: "Aroma", value: "Floral & citrus" }
  ],
    filters: {
      intensity: ["strong"],
      roast: ["dark"]
    }
  },

  {
    id: 9,
    name: "Capsule Medium",
    tagline: "Smooth & creamy",
    category: "Capsules",
    price: 48,
    image: "/images/1.png",
    description:
    "A high-altitude heirloom from Guji, bright and expressive with floral lift and stone-fruit sweetness.",

  details: [
    { label: "Altitude", value: "2,000–2,200 m" },
    { label: "Process", value: "Washed" },
    { label: "Roast", value: "Medium" },
    { label: "Body", value: "Silky" },
    { label: "Aroma", value: "Floral & citrus" }
  ],
    filters: {
      intensity: ["medium"],
      roast: ["medium"]
    }
  },

  /* ---------------- MERCH ---------------- */

  {
    id: 10,
    name: "White Mantis Mug",
    tagline: "Ceramic mug",
    category: "Merch",
    price: 35,
    image: "/images/1.png",
    description:
    "A high-altitude heirloom from Guji, bright and expressive with floral lift and stone-fruit sweetness.",

  details: [
    { label: "Altitude", value: "2,000–2,200 m" },
    { label: "Process", value: "Washed" },
    { label: "Roast", value: "Medium" },
    { label: "Body", value: "Silky" },
    { label: "Aroma", value: "Floral & citrus" }
  ],
    filters: {
      material: ["ceramic"],
      color: ["white"]
    }
  },

  {
    id: 11,
    name: "Barista T-Shirt",
    tagline: "Premium cotton",
    category: "Merch",
    price: 60,
    image: "/images/1.png",
    description:
    "A high-altitude heirloom from Guji, bright and expressive with floral lift and stone-fruit sweetness.",

  details: [
    { label: "Altitude", value: "2,000–2,200 m" },
    { label: "Process", value: "Washed" },
    { label: "Roast", value: "Medium" },
    { label: "Body", value: "Silky" },
    { label: "Aroma", value: "Floral & citrus" }
  ],
    filters: {
      size: ["s", "m", "l"],
      color: ["black"]
    }
  },

  /* ---------------- EQUIPMENT ---------------- */

  {
    id: 12,
    name: "Manual Grinder",
    tagline: "Adjustable burr",
    category: "Equipment",
    price: 120,
    image: "/images/1.png",
    description:
    "A high-altitude heirloom from Guji, bright and expressive with floral lift and stone-fruit sweetness.",

  details: [
    { label: "Altitude", value: "2,000–2,200 m" },
    { label: "Process", value: "Washed" },
    { label: "Roast", value: "Medium" },
    { label: "Body", value: "Silky" },
    { label: "Aroma", value: "Floral & citrus" }
  ],
    filters: {
      type: ["grinder"],
      material: ["steel"]
    }
  },

  {
    id: 13,
    name: "Pour Over Kit",
    tagline: "Complete starter kit",
    category: "Equipment",
    price: 180,
    image: "/images/1.png",
    description:
    "A high-altitude heirloom from Guji, bright and expressive with floral lift and stone-fruit sweetness.",

  details: [
    { label: "Altitude", value: "2,000–2,200 m" },
    { label: "Process", value: "Washed" },
    { label: "Roast", value: "Medium" },
    { label: "Body", value: "Silky" },
    { label: "Aroma", value: "Floral & citrus" }
  ],
    filters: {
      type: ["kit"],
      brew: ["pour over"]
    }
  },

  /* ---------------- SUBSCRIPTIONS ---------------- */

  {
    id: 14,
    name: "Monthly Plan",
    tagline: "Fresh beans monthly",
    category: "Subscriptions",
    price: 200,
    image: "/images/1.png",
    description:
    "A high-altitude heirloom from Guji, bright and expressive with floral lift and stone-fruit sweetness.",

  details: [
    { label: "Altitude", value: "2,000–2,200 m" },
    { label: "Process", value: "Washed" },
    { label: "Roast", value: "Medium" },
    { label: "Body", value: "Silky" },
    { label: "Aroma", value: "Floral & citrus" }
  ],
    filters: {
      duration: ["monthly"],
      roast: ["medium"]
    }
  }

];
