import poloImg from "@/assets/polo-royal.jpg";
import chemiseImg from "@/assets/chemise-elite.jpg";
import vestImg from "@/assets/vest-vortex.jpg";
import costumeImg from "@/assets/costume-phantom.jpg";
import manteauImg from "@/assets/manteau-prestige.jpg";
import collectionImg from "@/assets/collection-supreme.jpg";

export interface InvestmentType {
  id: string;
  name: string;
  price: number;
  dailyReturn: number;
  totalReturn: number;
  duration: number;
  image: string;
  tag?: string;
}

export const investmentTypes: InvestmentType[] = [
  {
    id: "1",
    name: "Débutant",
    price: 4000,
    dailyReturn: 600,
    totalReturn: 108000,
    duration: 180,
    image: poloImg,
    tag: "DÉBUTANT",
  },
  {
    id: "2",
    name: "Starter",
    price: 8000,
    dailyReturn: 1400,
    totalReturn: 252000,
    duration: 180,
    image: chemiseImg,
    tag: "STARTER",
  },
  {
    id: "3",
    name: "Populaire",
    price: 17000,
    dailyReturn: 3200,
    totalReturn: 576000,
    duration: 180,
    image: vestImg,
    tag: "POPULAIRE",
  },
  {
    id: "4",
    name: "Tendance",
    price: 27000,
    dailyReturn: 4000,
    totalReturn: 720000,
    duration: 180,
    image: costumeImg,
    tag: "TENDANCE",
  },
  {
    id: "5",
    name: "Premium",
    price: 75000,
    dailyReturn: 12000,
    totalReturn: 2160000,
    duration: 180,
    image: manteauImg,
    tag: "PREMIUM",
  },
  {
    id: "6",
    name: "Élite",
    price: 125000,
    dailyReturn: 25000,
    totalReturn: 4500000,
    duration: 180,
    image: collectionImg,
    tag: "ÉLITE",
  },
  {
    id: "7",
    name: "Exclusif",
    price: 300000,
    dailyReturn: 25000,
    totalReturn: 4500000,
    duration: 180,
    image: poloImg,
    tag: "EXCLUSIF",
  },
  {
    id: "8",
    name: "VIP",
    price: 350000,
    dailyReturn: 6000,
    totalReturn: 1080000,
    duration: 180,
    image: chemiseImg,
    tag: "VIP",
  },
  {
    id: "9",
    name: "Ultra VIP",
    price: 500000,
    dailyReturn: 65000,
    totalReturn: 11700000,
    duration: 180,
    image: vestImg,
    tag: "ULTRA VIP",
  },
  {
    id: "10",
    name: "Légende",
    price: 1000000,
    dailyReturn: 120000,
    totalReturn: 21600000,
    duration: 180,
    image: costumeImg,
    tag: "LÉGENDE",
  },
  {
    id: "11",
    name: "Mythique",
    price: 2000000,
    dailyReturn: 240000,
    totalReturn: 43200000,
    duration: 180,
    image: manteauImg,
    tag: "MYTHIQUE",
  },
];
