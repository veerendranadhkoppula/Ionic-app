
const API_BASE = "https://endpoint.whitemantis.ae/api";


export interface WtCoinsConfig {
  pointsEarn         : number;   
  pointsToAed        : number;  
  maxPointsPerOrder  : number;  
  minPointsPerOrder  : number;   
}

export async function getWtCoinsConfig(): Promise<WtCoinsConfig> {
  try {
    const res = await fetch(`${API_BASE}/globals/wt-coins`, { method: "GET" });
    if (!res.ok) {
      console.warn(`getWtCoinsConfig failed: ${res.status}`);
      return { pointsEarn: 10, pointsToAed: 10, maxPointsPerOrder: 0, minPointsPerOrder: 0 };
    }
    const data = await res.json();
    return {
      pointsEarn        : typeof data?.pointsEarn        === "number" ? data.pointsEarn        : 10,
      pointsToAed       : typeof data?.pointsToAed       === "number" ? data.pointsToAed       : 10,
      maxPointsPerOrder : typeof data?.maxPointsPerOrder === "number" ? data.maxPointsPerOrder : 0,
      minPointsPerOrder : typeof data?.minPointsPerOrder === "number" ? data.minPointsPerOrder : 0,
    };
  } catch (e) {
    console.warn("getWtCoinsConfig error:", e);
    return { pointsEarn: 10, pointsToAed: 10, maxPointsPerOrder: 0, minPointsPerOrder: 0 };
  }
}


export async function getUserWtCoins(token: string | null): Promise<number> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `JWT ${token}`;

  try {
    const res = await fetch(`${API_BASE}/user-wt-coins`, { method: "GET", headers });
    if (!res.ok) {
      console.warn(`getUserWtCoins failed: ${res.status}`);
      return 0;
    }
    const data = await res.json();
    // Response shape: { docs: [{ totalBalance: 20, ... }], ... }
    if (Array.isArray(data?.docs) && data.docs.length > 0) {
      const balance = data.docs[0]?.totalBalance;
      if (typeof balance === "number") return balance;
    }
    // Fallback for older shapes: { coins: 120 } | { balance: 120 } | { wtCoins: 120 } | number
    return (
      typeof data === "number" ? data :
      typeof data?.coins === "number" ? data.coins :
      typeof data?.balance === "number" ? data.balance :
      typeof data?.wtCoins === "number" ? data.wtCoins :
      0
    );
  } catch (e) {
    console.warn("getUserWtCoins error:", e);
    return 0;
  }
}

export default { getUserWtCoins, getWtCoinsConfig };
