import { IndiaState } from "../types";

/** All Indian states and union territories — single source of truth */
export const INDIA_STATES: IndiaState[] = [
  { id: "IN-AP", code: "AP", nameHi: "आंध्र प्रदेश", nameEn: "Andhra Pradesh", slug: "andhra-pradesh", isActive: true },
  { id: "IN-AR", code: "AR", nameHi: "अरुणाचल प्रदेश", nameEn: "Arunachal Pradesh", slug: "arunachal-pradesh", isActive: true },
  { id: "IN-AS", code: "AS", nameHi: "असम", nameEn: "Assam", slug: "assam", isActive: true },
  { id: "IN-BR", code: "BR", nameHi: "बिहार", nameEn: "Bihar", slug: "bihar", isActive: true },
  { id: "IN-CT", code: "CT", nameHi: "छत्तीसगढ़", nameEn: "Chhattisgarh", slug: "chhattisgarh", isActive: true },
  { id: "IN-GA", code: "GA", nameHi: "गोवा", nameEn: "Goa", slug: "goa", isActive: true },
  { id: "IN-GJ", code: "GJ", nameHi: "गुजरात", nameEn: "Gujarat", slug: "gujarat", isActive: true },
  { id: "IN-HR", code: "HR", nameHi: "हरियाणा", nameEn: "Haryana", slug: "haryana", isActive: true },
  { id: "IN-HP", code: "HP", nameHi: "हिमाचल प्रदेश", nameEn: "Himachal Pradesh", slug: "himachal-pradesh", isActive: true },
  { id: "IN-JH", code: "JH", nameHi: "झारखंड", nameEn: "Jharkhand", slug: "jharkhand", isActive: true },
  { id: "IN-KA", code: "KA", nameHi: "कर्नाटक", nameEn: "Karnataka", slug: "karnataka", isActive: true },
  { id: "IN-KL", code: "KL", nameHi: "केरल", nameEn: "Kerala", slug: "kerala", isActive: true },
  { id: "IN-MP", code: "MP", nameHi: "मध्य प्रदेश", nameEn: "Madhya Pradesh", slug: "madhya-pradesh", isActive: true },
  { id: "IN-MH", code: "MH", nameHi: "महाराष्ट्र", nameEn: "Maharashtra", slug: "maharashtra", isActive: true },
  { id: "IN-MN", code: "MN", nameHi: "मणिपुर", nameEn: "Manipur", slug: "manipur", isActive: true },
  { id: "IN-ML", code: "ML", nameHi: "मेघालय", nameEn: "Meghalaya", slug: "meghalaya", isActive: true },
  { id: "IN-MZ", code: "MZ", nameHi: "मिज़ोरम", nameEn: "Mizoram", slug: "mizoram", isActive: true },
  { id: "IN-NL", code: "NL", nameHi: "नागालैंड", nameEn: "Nagaland", slug: "nagaland", isActive: true },
  { id: "IN-OR", code: "OR", nameHi: "ओडिशा", nameEn: "Odisha", slug: "odisha", isActive: true },
  { id: "IN-PB", code: "PB", nameHi: "पंजाब", nameEn: "Punjab", slug: "punjab", isActive: true },
  { id: "IN-RJ", code: "RJ", nameHi: "राजस्थान", nameEn: "Rajasthan", slug: "rajasthan", isActive: true },
  { id: "IN-SK", code: "SK", nameHi: "सिक्किम", nameEn: "Sikkim", slug: "sikkim", isActive: true },
  { id: "IN-TN", code: "TN", nameHi: "तमिलनाडु", nameEn: "Tamil Nadu", slug: "tamil-nadu", isActive: true },
  { id: "IN-TG", code: "TG", nameHi: "तेलंगाना", nameEn: "Telangana", slug: "telangana", isActive: true },
  { id: "IN-TR", code: "TR", nameHi: "त्रिपुरा", nameEn: "Tripura", slug: "tripura", isActive: true },
  { id: "IN-UP", code: "UP", nameHi: "उत्तर प्रदेश", nameEn: "Uttar Pradesh", slug: "uttar-pradesh", isActive: true },
  { id: "IN-UK", code: "UK", nameHi: "उत्तराखंड", nameEn: "Uttarakhand", slug: "uttarakhand", isActive: true },
  { id: "IN-WB", code: "WB", nameHi: "पश्चिम बंगाल", nameEn: "West Bengal", slug: "west-bengal", isActive: true },
  { id: "IN-DL", code: "DL", nameHi: "दिल्ली", nameEn: "Delhi", slug: "delhi", isActive: true },
  { id: "IN-JK", code: "JK", nameHi: "जम्मू और कश्मीर", nameEn: "Jammu and Kashmir", slug: "jammu-kashmir", isActive: true },
  { id: "IN-LA", code: "LA", nameHi: "लद्दाख", nameEn: "Ladakh", slug: "ladakh", isActive: true },
  { id: "IN-CH", code: "CH", nameHi: "चंडीगढ़", nameEn: "Chandigarh", slug: "chandigarh", isActive: true },
  { id: "IN-PY", code: "PY", nameHi: "पुडुचेरी", nameEn: "Puducherry", slug: "puducherry", isActive: true },
];

export const INTERNATIONAL_MARKERS =
  /\b(usa|america|united states|china|russia|uk|britain|gaza|israel|pakistan|nepal|bangladesh|sri lanka|europe|africa|australia|canada|france|germany|japan|ukraine|middle east|अमेरिका|चीन|पाकिस्तान|यूरोप|गाज़ा|इज़राइल)\b/i;
