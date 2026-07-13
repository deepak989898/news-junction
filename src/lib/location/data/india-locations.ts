import { IndiaCity, IndiaDistrict } from "../types";

export const INDIA_DISTRICTS: IndiaDistrict[] = [
  { id: "UP-LKO", stateId: "IN-UP", nameHi: "लखनऊ", nameEn: "Lucknow", slug: "lucknow", isActive: true },
  { id: "UP-JLA", stateId: "IN-UP", nameHi: "जालौन", nameEn: "Jalaun", slug: "jalaun", isActive: true },
  { id: "UP-KNP", stateId: "IN-UP", nameHi: "कानपुर", nameEn: "Kanpur", slug: "kanpur", isActive: true },
  { id: "DL-ND", stateId: "IN-DL", nameHi: "नई दिल्ली", nameEn: "New Delhi", slug: "new-delhi", isActive: true },
  { id: "MH-MUM", stateId: "IN-MH", nameHi: "मुंबई", nameEn: "Mumbai", slug: "mumbai", isActive: true },
  { id: "MH-PUN", stateId: "IN-MH", nameHi: "पुणे", nameEn: "Pune", slug: "pune", isActive: true },
  { id: "KA-BLR", stateId: "IN-KA", nameHi: "बेंगलुरु", nameEn: "Bengaluru", slug: "bengaluru", isActive: true },
  { id: "RJ-JPR", stateId: "IN-RJ", nameHi: "जयपुर", nameEn: "Jaipur", slug: "jaipur", isActive: true },
  { id: "AS-GUW", stateId: "IN-AS", nameHi: "गुवाहाटी", nameEn: "Guwahati", slug: "guwahati", isActive: true },
];

export const INDIA_CITIES: IndiaCity[] = [
  { id: "city-lucknow", districtId: "UP-LKO", stateId: "IN-UP", nameHi: "लखनऊ", nameEn: "Lucknow", slug: "lucknow", isActive: true, nearbyCityIds: ["city-kanpur"], priority: 10 },
  { id: "city-kanpur", districtId: "UP-KNP", stateId: "IN-UP", nameHi: "कानपुर", nameEn: "Kanpur", slug: "kanpur", isActive: true, nearbyCityIds: ["city-lucknow"], priority: 9 },
  { id: "city-jalaun", districtId: "UP-JLA", stateId: "IN-UP", nameHi: "ओराई", nameEn: "Orai", slug: "orai-jalaun", isActive: true, nearbyCityIds: ["city-kanpur", "city-lucknow"], priority: 5 },
  { id: "city-delhi", districtId: "DL-ND", stateId: "IN-DL", nameHi: "दिल्ली", nameEn: "Delhi", slug: "delhi", isActive: true, nearbyCityIds: [], priority: 10 },
  { id: "city-mumbai", districtId: "MH-MUM", stateId: "IN-MH", nameHi: "मुंबई", nameEn: "Mumbai", slug: "mumbai", isActive: true, nearbyCityIds: ["city-pune"], priority: 10 },
  { id: "city-pune", districtId: "MH-PUN", stateId: "IN-MH", nameHi: "पुणे", nameEn: "Pune", slug: "pune", isActive: true, nearbyCityIds: ["city-mumbai"], priority: 9 },
  { id: "city-bengaluru", districtId: "KA-BLR", stateId: "IN-KA", nameHi: "बेंगलुरु", nameEn: "Bengaluru", slug: "bengaluru", isActive: true, nearbyCityIds: [], priority: 10 },
  { id: "city-jaipur", districtId: "RJ-JPR", stateId: "IN-RJ", nameHi: "जयपुर", nameEn: "Jaipur", slug: "jaipur", isActive: true, nearbyCityIds: [], priority: 10 },
  { id: "city-guwahati", districtId: "AS-GUW", stateId: "IN-AS", nameHi: "गुवाहाटी", nameEn: "Guwahati", slug: "guwahati", isActive: true, nearbyCityIds: [], priority: 10 },
];
