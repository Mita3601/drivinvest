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
    name: 'Polo "Royal S1"',
    price: 5000,
    dailyReturn: 250,
    totalReturn: 7500,
    duration: 30,
    image: poloImg,
    tag: "DÉBUTANT",
  },
  {
    id: "2",
    name: 'Chemise "Elite V3"',
    price: 10000,
    dailyReturn: 500,
    totalReturn: 15000,
    duration: 30,
    image: chemiseImg,
    tag: "POPULAIRE",
  },
  {
    id: "3",
    name: 'Veste "Vortex X2"',
    price: 20000,
    dailyReturn: 1000,
    totalReturn: 30000,
    duration: 30,
    image: vestImg,
    tag: "TENDANCE",
  },
  {
    id: "4",
    name: 'Costume "Phantom X1"',
    price: 50000,
    dailyReturn: 2500,
    totalReturn: 75000,
    duration: 30,
    image: costumeImg,
    tag: "PREMIUM",
  },
  {
    id: "5",
    name: 'Manteau "Prestige L4"',
    price: 100000,
    dailyReturn: 5000,
    totalReturn: 150000,
    duration: 30,
    image: manteauImg,
    tag: "EXCLUSIF",
  },
  {
    id: "6",
    name: 'Collection "Suprême"',
    price: 300000,
    dailyReturn: 15000,
    totalReturn: 450000,
    duration: 30,
    image: collectionImg,
    tag: "ULTRA VIP",
  },
];
