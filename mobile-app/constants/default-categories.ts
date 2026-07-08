import { Category } from "@/types/news";

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "home", nameHi: "होम", nameEn: "Home", slug: "home", isActive: true, order: 0 },
  { id: "desh", nameHi: "देश", nameEn: "India", slug: "desh", isActive: true, order: 1 },
  { id: "rajya", nameHi: "राज्य", nameEn: "State", slug: "rajya", isActive: true, order: 2 },
  { id: "duniya", nameHi: "दुनिया", nameEn: "World", slug: "duniya", isActive: true, order: 3 },
  { id: "khel", nameHi: "खेल", nameEn: "Sports", slug: "khel", isActive: true, order: 4 },
  { id: "manoranjan", nameHi: "मनोरंजन", nameEn: "Entertainment", slug: "manoranjan", isActive: true, order: 5 },
  { id: "technology", nameHi: "टेक्नोलॉजी", nameEn: "Technology", slug: "technology", isActive: true, order: 6 },
  { id: "vyapar", nameHi: "व्यापार", nameEn: "Business", slug: "vyapar", isActive: true, order: 7 },
  { id: "swasthya", nameHi: "स्वास्थ्य", nameEn: "Health", slug: "swasthya", isActive: true, order: 8 },
  { id: "video", nameHi: "वीडियो", nameEn: "Videos", slug: "video", isActive: true, order: 9 },
];
