import type { SitePage, SitePageKey, PolicySection } from "@/lib/trust/types";
import { getPolicyMeta } from "@/lib/trust/page-config";

/** Default "last updated" date for seeded content (admin edits will override). */
export const POLICY_DEFAULT_UPDATED = "2026-07-15T00:00:00.000Z";

type SectionSpec = {
  id: string;
  hEn: string;
  hHi: string;
  bEn: string;
  bHi: string;
  highlight?: boolean;
};

function buildPage(
  key: SitePageKey,
  opts: {
    summaryEn: string;
    summaryHi: string;
    seoDescEn: string;
    seoDescHi: string;
    sections: SectionSpec[];
  }
): SitePage {
  const meta = getPolicyMeta(key);
  return {
    pageKey: key,
    titleEn: meta.titleEn,
    titleHi: meta.titleHi,
    summaryEn: opts.summaryEn,
    summaryHi: opts.summaryHi,
    sections: opts.sections.map((s, i): PolicySection => ({
      id: s.id,
      headingEn: s.hEn,
      headingHi: s.hHi,
      bodyEn: s.bEn,
      bodyHi: s.bHi,
      order: i,
      highlight: s.highlight,
    })),
    lastUpdatedAt: POLICY_DEFAULT_UPDATED,
    published: true,
    seoTitleEn: `${meta.titleEn} | News Junction`,
    seoTitleHi: `${meta.titleHi} | News Junction`,
    seoDescriptionEn: opts.seoDescEn,
    seoDescriptionHi: opts.seoDescHi,
    version: 1,
    updatedBy: "system-default",
    createdAt: POLICY_DEFAULT_UPDATED,
    updatedAt: POLICY_DEFAULT_UPDATED,
  };
}

const ABOUT_US = buildPage("about-us", {
  summaryEn:
    "News Junction is a Hindi–English digital news platform focused primarily on India — covering national, state, district and city-level stories.",
  summaryHi:
    "News Junction एक हिंदी–अंग्रेज़ी डिजिटल समाचार मंच है जो मुख्य रूप से भारत पर केंद्रित है — राष्ट्रीय, राज्य, ज़िला और शहर स्तर की खबरें।",
  seoDescEn:
    "Learn about News Junction, a bilingual (Hindi & English) India-first digital news platform, our mission, coverage and editorial approach.",
  seoDescHi:
    "News Junction के बारे में जानें — एक द्विभाषी (हिंदी और अंग्रेज़ी) भारत-केंद्रित डिजिटल समाचार मंच, हमारा मिशन, कवरेज और संपादकीय दृष्टिकोण।",
  sections: [
    {
      id: "who-we-are",
      hEn: "Who We Are",
      hHi: "हम कौन हैं",
      bEn:
        "News Junction is a bilingual digital news platform that publishes news in both Hindi and English. We focus primarily on India, bringing readers national headlines alongside state, district and city-level coverage in one place.\n\nOur goal is simple: make trustworthy, easy-to-read news accessible to Indian readers in the language they are most comfortable with.",
      bHi:
        "News Junction एक द्विभाषी डिजिटल समाचार मंच है जो हिंदी और अंग्रेज़ी दोनों में खबरें प्रकाशित करता है। हमारा मुख्य ध्यान भारत पर है — हम राष्ट्रीय सुर्खियों के साथ-साथ राज्य, ज़िला और शहर स्तर की खबरें एक ही स्थान पर लाते हैं।\n\nहमारा उद्देश्य सरल है: भरोसेमंद और आसानी से पढ़ी जाने वाली खबरें भारतीय पाठकों तक उनकी पसंदीदा भाषा में पहुँचाना।",
    },
    {
      id: "our-mission",
      hEn: "Our Mission",
      hHi: "हमारा मिशन",
      bEn:
        "We aim to inform, not mislead. We work to present news clearly, verify important facts, be transparent about how our content is produced, and correct mistakes openly when they happen.",
      bHi:
        "हम सूचित करना चाहते हैं, भ्रमित नहीं। हम खबरों को स्पष्ट रूप से प्रस्तुत करने, महत्वपूर्ण तथ्यों की पुष्टि करने, अपनी सामग्री कैसे बनती है इस बारे में पारदर्शी रहने, और गलती होने पर उसे खुले तौर पर सुधारने के लिए काम करते हैं।",
    },
    {
      id: "what-we-cover",
      hEn: "What We Cover",
      hHi: "हम क्या कवर करते हैं",
      bEn:
        "Our coverage spans India and the world across categories such as India, State, World, Sports, Entertainment, Technology, Business, Health and Videos.\n\nWe pay special attention to local relevance, organising stories by state, district and city so readers can follow news that matters where they live.",
      bHi:
        "हमारा कवरेज भारत और दुनिया — देश, राज्य, दुनिया, खेल, मनोरंजन, टेक्नोलॉजी, व्यापार, स्वास्थ्य और वीडियो जैसी श्रेणियों में फैला है।\n\nहम स्थानीय प्रासंगिकता पर विशेष ध्यान देते हैं और खबरों को राज्य, ज़िला और शहर के अनुसार व्यवस्थित करते हैं ताकि पाठक अपने क्षेत्र की खबरें आसानी से पढ़ सकें।",
    },
    {
      id: "editorial-approach",
      hEn: "Our Editorial Approach",
      hHi: "हमारा संपादकीय दृष्टिकोण",
      bEn:
        "We combine technology with editorial judgement. We use automation and AI to help discover topics, draft, translate and format content efficiently, while accuracy, fairness and transparency guide what we publish.\n\nRead more in our [Editorial Policy](/editorial-policy), [Fact-Checking Policy](/fact-checking-policy) and [AI Usage Policy](/ai-usage-policy).",
      bHi:
        "हम तकनीक को संपादकीय विवेक के साथ जोड़ते हैं। हम विषयों की खोज, ड्राफ्टिंग, अनुवाद और फ़ॉर्मैटिंग को कुशल बनाने के लिए ऑटोमेशन और एआई का उपयोग करते हैं, जबकि हम जो प्रकाशित करते हैं उसमें सटीकता, निष्पक्षता और पारदर्शिता हमारा मार्गदर्शन करती है।\n\nअधिक पढ़ें: हमारी [संपादकीय नीति](/editorial-policy), [तथ्य-जाँच नीति](/fact-checking-policy) और [एआई उपयोग नीति](/ai-usage-policy)।",
    },
    {
      id: "technology-ai",
      hEn: "Use of Technology and AI",
      hHi: "तकनीक और एआई का उपयोग",
      bEn:
        "Parts of our workflow are automated and AI-assisted. AI may help with topic discovery, drafting, summarising, translation, SEO and images. AI-assisted content may be reviewed automatically or manually depending on topic and risk level. We disclose AI involvement where applicable.",
      bHi:
        "हमारी प्रक्रिया के कुछ हिस्से स्वचालित और एआई-सहायता प्राप्त हैं। एआई विषय खोज, ड्राफ्टिंग, सारांश, अनुवाद, एसईओ और छवियों में मदद कर सकता है। एआई-सहायता प्राप्त सामग्री की समीक्षा विषय और जोखिम स्तर के अनुसार स्वचालित या मैन्युअल रूप से की जा सकती है। जहाँ लागू हो, हम एआई की भागीदारी का खुलासा करते हैं।",
      highlight: true,
    },
    {
      id: "independence",
      hEn: "Independence and Transparency",
      hHi: "स्वतंत्रता और पारदर्शिता",
      bEn:
        "We believe readers deserve to know who is behind the news and how it is funded. See our [Ownership & Funding](/ownership-and-funding) page for details about who operates News Junction and how it is supported.",
      bHi:
        "हमारा मानना है कि पाठकों को यह जानने का अधिकार है कि खबरों के पीछे कौन है और उन्हें कैसे वित्तपोषित किया जाता है। News Junction को कौन संचालित करता है और इसे कैसे समर्थन मिलता है, इसके विवरण के लिए हमारा [स्वामित्व और वित्तपोषण](/ownership-and-funding) पृष्ठ देखें।",
    },
    {
      id: "corrections-commitment",
      hEn: "Corrections Commitment",
      hHi: "सुधार के प्रति प्रतिबद्धता",
      bEn:
        "We are committed to correcting errors promptly and transparently. If you spot a mistake, please tell us through our [Contact page](/contact-us) or read our [Corrections Policy](/corrections-policy).",
      bHi:
        "हम गलतियों को तुरंत और पारदर्शी तरीके से सुधारने के लिए प्रतिबद्ध हैं। यदि आपको कोई त्रुटि दिखे, तो कृपया हमारे [संपर्क पृष्ठ](/contact-us) के माध्यम से हमें बताएँ या हमारी [सुधार नीति](/corrections-policy) पढ़ें।",
    },
    {
      id: "team",
      hEn: "Our Team",
      hHi: "हमारी टीम",
      bEn:
        "Our content is produced by the News Junction editorial team supported by automated systems. You can learn more about our contributors on the [Authors page](/authors).",
      bHi:
        "हमारी सामग्री News Junction संपादकीय टीम द्वारा तैयार की जाती है, जिसे स्वचालित प्रणालियों का सहयोग प्राप्त है। हमारे योगदानकर्ताओं के बारे में अधिक जानने के लिए [लेखक पृष्ठ](/authors) देखें।",
    },
  ],
});

const EDITORIAL_POLICY = buildPage("editorial-policy", {
  summaryEn:
    "How News Junction selects, sources, writes and reviews the news — our commitment to accuracy, fairness and independence.",
  summaryHi:
    "News Junction खबरों का चयन, स्रोत, लेखन और समीक्षा कैसे करता है — सटीकता, निष्पक्षता और स्वतंत्रता के प्रति हमारी प्रतिबद्धता।",
  seoDescEn:
    "News Junction's editorial policy: accuracy, fairness, sourcing, attribution, conflicts of interest, sensitive reporting and AI-assisted editorial workflow.",
  seoDescHi:
    "News Junction की संपादकीय नीति: सटीकता, निष्पक्षता, स्रोत, श्रेय, हितों का टकराव, संवेदनशील रिपोर्टिंग और एआई-सहायता प्राप्त संपादकीय प्रक्रिया।",
  sections: [
    {
      id: "mission",
      hEn: "Editorial Mission",
      hHi: "संपादकीय मिशन",
      bEn:
        "Our mission is to publish accurate, fair and useful news for Indian readers in Hindi and English. We prioritise clarity, context and public interest over speed or sensationalism.",
      bHi:
        "हमारा मिशन भारतीय पाठकों के लिए हिंदी और अंग्रेज़ी में सटीक, निष्पक्ष और उपयोगी खबरें प्रकाशित करना है। हम गति या सनसनीखेज़ता के बजाय स्पष्टता, संदर्भ और जनहित को प्राथमिकता देते हैं।",
    },
    {
      id: "accuracy",
      hEn: "Accuracy and Fairness",
      hHi: "सटीकता और निष्पक्षता",
      bEn:
        "We aim to get the facts right and to represent people and events fairly. When a story develops or new information emerges, we update it. Where relevant, we seek multiple perspectives.",
      bHi:
        "हम तथ्यों को सही रखने और लोगों व घटनाओं का निष्पक्ष चित्रण करने का प्रयास करते हैं। जब कोई खबर विकसित होती है या नई जानकारी सामने आती है, तो हम उसे अपडेट करते हैं। जहाँ प्रासंगिक हो, हम विभिन्न दृष्टिकोण लेते हैं।",
    },
    {
      id: "sourcing",
      hEn: "News Selection and Sources",
      hHi: "खबर चयन और स्रोत",
      bEn:
        "We select stories based on relevance, public interest and reliability of information. We prefer primary and official sources where available, and evaluate secondary sources for credibility before relying on them.\n\n- **Primary sources**: official statements, documents, first-hand accounts.\n- **Secondary sources**: established news agencies and reputable outlets, used with attribution.",
      bHi:
        "हम प्रासंगिकता, जनहित और जानकारी की विश्वसनीयता के आधार पर खबरों का चयन करते हैं। जहाँ उपलब्ध हों, हम प्राथमिक और आधिकारिक स्रोतों को प्राथमिकता देते हैं, और द्वितीयक स्रोतों पर भरोसा करने से पहले उनकी विश्वसनीयता का आकलन करते हैं।\n\n- **प्राथमिक स्रोत**: आधिकारिक बयान, दस्तावेज़, प्रत्यक्ष विवरण।\n- **द्वितीयक स्रोत**: स्थापित समाचार एजेंसियाँ और प्रतिष्ठित संस्थान, श्रेय के साथ उपयोग किए जाते हैं।",
    },
    {
      id: "attribution",
      hEn: "Attribution and Quotes",
      hHi: "श्रेय और उद्धरण",
      bEn:
        "We attribute information to its source. Quotes are used in context and not altered to change their meaning. We credit the original publisher or agency where content is based on their reporting.",
      bHi:
        "हम जानकारी का श्रेय उसके स्रोत को देते हैं। उद्धरणों का उपयोग संदर्भ में किया जाता है और उनके अर्थ को बदलने के लिए उन्हें परिवर्तित नहीं किया जाता। जहाँ सामग्री किसी की रिपोर्टिंग पर आधारित हो, हम मूल प्रकाशक या एजेंसी को श्रेय देते हैं।",
    },
    {
      id: "opinion-sponsored",
      hEn: "Opinion, Sponsored Content and Conflicts of Interest",
      hHi: "राय, प्रायोजित सामग्री और हितों का टकराव",
      bEn:
        "Opinion and analysis are clearly distinguished from news reporting. Any sponsored or paid content will be labelled as such. We avoid conflicts of interest and disclose them where they are unavoidable. We maintain political neutrality in our reporting.",
      bHi:
        "राय और विश्लेषण को समाचार रिपोर्टिंग से स्पष्ट रूप से अलग किया जाता है। किसी भी प्रायोजित या भुगतान की गई सामग्री को उसी रूप में चिह्नित किया जाएगा। हम हितों के टकराव से बचते हैं और जहाँ अपरिहार्य हो वहाँ उनका खुलासा करते हैं। हम अपनी रिपोर्टिंग में राजनीतिक तटस्थता बनाए रखते हैं।",
    },
    {
      id: "sensitive",
      hEn: "Crime, Court and Sensitive Reporting",
      hHi: "अपराध, अदालत और संवेदनशील रिपोर्टिंग",
      bEn:
        "For crime and allegations we respect the presumption of innocence and avoid declaring guilt before due process. In court reporting we aim to be accurate and balanced. We take special care with children, victims and vulnerable persons, and we handle graphic or sensitive content responsibly.",
      bHi:
        "अपराध और आरोपों के मामले में हम निर्दोषता की धारणा का सम्मान करते हैं और उचित कानूनी प्रक्रिया से पहले दोष घोषित करने से बचते हैं। अदालती रिपोर्टिंग में हम सटीक और संतुलित रहने का प्रयास करते हैं। हम बच्चों, पीड़ितों और कमज़ोर व्यक्तियों के मामले में विशेष सावधानी बरतते हैं, और ग्राफ़िक या संवेदनशील सामग्री को ज़िम्मेदारी से संभालते हैं।",
    },
    {
      id: "ai-workflow",
      hEn: "AI-Assisted Editorial Workflow",
      hHi: "एआई-सहायता प्राप्त संपादकीय प्रक्रिया",
      bEn:
        "News Junction uses automation and AI in parts of its editorial workflow. AI-assisted content may be reviewed automatically or manually according to risk level and our editorial workflow; higher-risk topics receive additional checks. We do not claim that every article is manually reviewed. See our [AI Usage Policy](/ai-usage-policy) for details.",
      bHi:
        "News Junction अपनी संपादकीय प्रक्रिया के कुछ हिस्सों में ऑटोमेशन और एआई का उपयोग करता है। एआई-सहायता प्राप्त सामग्री की समीक्षा जोखिम स्तर और हमारी संपादकीय प्रक्रिया के अनुसार स्वचालित या मैन्युअल रूप से की जा सकती है; अधिक संवेदनशील विषयों की अतिरिक्त जाँच होती है। हम यह दावा नहीं करते कि हर लेख की मैन्युअल समीक्षा होती है। विवरण के लिए हमारी [एआई उपयोग नीति](/ai-usage-policy) देखें।",
      highlight: true,
    },
    {
      id: "corrections-removal",
      hEn: "Corrections, Updates and Removal Requests",
      hHi: "सुधार, अपडेट और हटाने के अनुरोध",
      bEn:
        "We correct errors as described in our [Corrections Policy](/corrections-policy). We consider reasonable requests to update or unpublish content, particularly where accuracy, privacy or legal concerns apply. Requests can be sent through our [Contact page](/contact-us).",
      bHi:
        "हम अपनी [सुधार नीति](/corrections-policy) के अनुसार गलतियों को सुधारते हैं। हम सामग्री को अपडेट करने या हटाने के उचित अनुरोधों पर विचार करते हैं, विशेषकर जहाँ सटीकता, गोपनीयता या कानूनी चिंताएँ हों। अनुरोध हमारे [संपर्क पृष्ठ](/contact-us) के माध्यम से भेजे जा सकते हैं।",
    },
    {
      id: "independence",
      hEn: "Editorial Independence",
      hHi: "संपादकीय स्वतंत्रता",
      bEn:
        "Editorial decisions are made independently of commercial and advertising interests. Advertising and sponsorship do not determine our news coverage.",
      bHi:
        "संपादकीय निर्णय वाणिज्यिक और विज्ञापन हितों से स्वतंत्र रूप से लिए जाते हैं। विज्ञापन और प्रायोजन हमारी समाचार कवरेज को निर्धारित नहीं करते।",
    },
  ],
});

const FACT_CHECKING_POLICY = buildPage("fact-checking-policy", {
  summaryEn:
    "How we verify information before and after publication — our source hierarchy, checks and how you can report an error.",
  summaryHi:
    "हम प्रकाशन से पहले और बाद में जानकारी की पुष्टि कैसे करते हैं — हमारी स्रोत प्राथमिकता, जाँच और आप त्रुटि की सूचना कैसे दे सकते हैं।",
  seoDescEn:
    "News Junction fact-checking policy: verification of claims, names, dates, numbers, images, government and health information, and AI-generated content.",
  seoDescHi:
    "News Junction तथ्य-जाँच नीति: दावों, नामों, तिथियों, संख्याओं, छवियों, सरकारी व स्वास्थ्य जानकारी और एआई-निर्मित सामग्री का सत्यापन।",
  sections: [
    {
      id: "why",
      hEn: "Why Fact-Checking Matters",
      hHi: "तथ्य-जाँच क्यों मायने रखती है",
      bEn:
        "Accurate information helps readers make informed decisions and reduces the spread of misinformation. Verification is a core part of how we work.",
      bHi:
        "सटीक जानकारी पाठकों को सूचित निर्णय लेने में मदद करती है और गलत सूचना के प्रसार को कम करती है। सत्यापन हमारे कार्य का एक मुख्य हिस्सा है।",
    },
    {
      id: "hierarchy",
      hEn: "Source Hierarchy",
      hHi: "स्रोत प्राथमिकता",
      bEn:
        "We give greater weight to primary and official sources, followed by established news agencies and reputable outlets. Unverified social-media claims are treated with caution and labelled as unverified where used.",
      bHi:
        "हम प्राथमिक और आधिकारिक स्रोतों को अधिक महत्व देते हैं, उसके बाद स्थापित समाचार एजेंसियों और प्रतिष्ठित संस्थानों को। असत्यापित सोशल-मीडिया दावों को सावधानी से लिया जाता है और उपयोग किए जाने पर उन्हें असत्यापित के रूप में चिह्नित किया जाता है।",
    },
    {
      id: "before-publication",
      hEn: "Verification Before Publication",
      hHi: "प्रकाशन से पहले सत्यापन",
      bEn:
        "Before publishing important claims we aim to verify key details such as names, dates, numbers and locations, and to cross-check significant claims against reliable sources. Quotes and statements are checked for context.",
      bHi:
        "महत्वपूर्ण दावों को प्रकाशित करने से पहले हम नाम, तिथि, संख्या और स्थान जैसे मुख्य विवरणों को सत्यापित करने और महत्वपूर्ण दावों को विश्वसनीय स्रोतों से मिलान करने का प्रयास करते हैं। उद्धरणों और बयानों की संदर्भ के लिए जाँच की जाती है।",
    },
    {
      id: "special-topics",
      hEn: "Sensitive Categories",
      hHi: "संवेदनशील श्रेणियाँ",
      bEn:
        "We apply extra caution to government announcements, financial and market data, health-related information, crime allegations, and election and political claims. Images and videos are assessed for authenticity where feasible.",
      bHi:
        "हम सरकारी घोषणाओं, वित्तीय व बाज़ार डेटा, स्वास्थ्य-संबंधी जानकारी, अपराध के आरोपों, और चुनाव व राजनीतिक दावों पर अतिरिक्त सावधानी बरतते हैं। जहाँ संभव हो, छवियों और वीडियो की प्रामाणिकता का आकलन किया जाता है।",
    },
    {
      id: "breaking",
      hEn: "Breaking-News Limitations",
      hHi: "ब्रेकिंग न्यूज़ की सीमाएँ",
      bEn:
        "During fast-moving events, early information can be incomplete or change. We label developing stories where appropriate and update them as verified facts become available.",
      bHi:
        "तेज़ी से बदलती घटनाओं के दौरान शुरुआती जानकारी अधूरी हो सकती है या बदल सकती है। हम विकसित हो रही खबरों को उपयुक्त रूप से चिह्नित करते हैं और सत्यापित तथ्य उपलब्ध होने पर उन्हें अपडेट करते हैं।",
    },
    {
      id: "ai-content",
      hEn: "AI-Generated Content Verification",
      hHi: "एआई-निर्मित सामग्री का सत्यापन",
      bEn:
        "Content that is AI-assisted is subject to the same accuracy standards as any other content. We do not mark an article as \"verified\" merely because it was generated with AI. Verification labels reflect actual workflow conditions, not automation alone.",
      bHi:
        "एआई-सहायता प्राप्त सामग्री उसी सटीकता मानकों के अधीन है जो किसी भी अन्य सामग्री पर लागू होते हैं। हम किसी लेख को केवल इसलिए \"सत्यापित\" के रूप में चिह्नित नहीं करते क्योंकि वह एआई से बनाया गया है। सत्यापन लेबल वास्तविक प्रक्रिया की स्थिति को दर्शाते हैं, केवल ऑटोमेशन को नहीं।",
      highlight: true,
    },
    {
      id: "report",
      hEn: "How Readers Can Report an Error",
      hHi: "पाठक त्रुटि की सूचना कैसे दें",
      bEn:
        "If you believe something is inaccurate, please report it through our [Contact page](/contact-us) by selecting \"Report an error\". Include the article link and what you believe is incorrect. See also our [Corrections Policy](/corrections-policy).",
      bHi:
        "यदि आपको लगता है कि कुछ गलत है, तो कृपया हमारे [संपर्क पृष्ठ](/contact-us) पर \"गलती की सूचना दें\" चुनकर इसकी सूचना दें। लेख का लिंक और आपको जो गलत लगता है उसे शामिल करें। हमारी [सुधार नीति](/corrections-policy) भी देखें।",
    },
  ],
});

const CORRECTIONS_POLICY = buildPage("corrections-policy", {
  summaryEn:
    "Our commitment to correcting errors transparently, the types of corrections we make, and how to request one.",
  summaryHi:
    "गलतियों को पारदर्शी रूप से सुधारने की हमारी प्रतिबद्धता, हम किस प्रकार के सुधार करते हैं, और सुधार का अनुरोध कैसे करें।",
  seoDescEn:
    "News Junction corrections policy: how we handle minor and material corrections, updates, retractions, removals and reader correction requests.",
  seoDescHi:
    "News Junction सुधार नीति: हम छोटे और बड़े सुधार, अपडेट, वापसी, हटाने और पाठक सुधार अनुरोधों को कैसे संभालते हैं।",
  sections: [
    {
      id: "commitment",
      hEn: "Our Commitment",
      hHi: "हमारी प्रतिबद्धता",
      bEn:
        "We are committed to correcting factual errors promptly and openly. When we make a substantive correction, we aim to be transparent about what changed.",
      bHi:
        "हम तथ्यात्मक गलतियों को तुरंत और खुले तौर पर सुधारने के लिए प्रतिबद्ध हैं। जब हम कोई महत्वपूर्ण सुधार करते हैं, तो हम इस बारे में पारदर्शी रहने का प्रयास करते हैं कि क्या बदला।",
    },
    {
      id: "types",
      hEn: "Types of Corrections",
      hHi: "सुधार के प्रकार",
      bEn:
        "- **Minor corrections**: typos, formatting and small clarifications.\n- **Material corrections**: factual errors that affect the meaning of a story.\n- **Headline and image corrections**: changes to a headline or image that could mislead.\n- **Attribution corrections**: fixing an incorrect source or credit.",
      bHi:
        "- **छोटे सुधार**: टाइपिंग की गलतियाँ, फ़ॉर्मैटिंग और छोटे स्पष्टीकरण।\n- **महत्वपूर्ण सुधार**: तथ्यात्मक गलतियाँ जो खबर के अर्थ को प्रभावित करती हैं।\n- **शीर्षक और छवि सुधार**: शीर्षक या छवि में बदलाव जो भ्रामक हो सकते हैं।\n- **श्रेय सुधार**: गलत स्रोत या श्रेय को ठीक करना।",
    },
    {
      id: "update-vs-correction",
      hEn: "Update versus Correction",
      hHi: "अपडेट बनाम सुधार",
      bEn:
        "An **update** adds new information to a developing story. A **correction** fixes something that was wrong. Major factual corrections are not made silently; we note them where appropriate.",
      bHi:
        "**अपडेट** किसी विकसित हो रही खबर में नई जानकारी जोड़ता है। **सुधार** किसी गलत बात को ठीक करता है। बड़े तथ्यात्मक सुधार चुपचाप नहीं किए जाते; जहाँ उपयुक्त हो, हम उन्हें दर्ज करते हैं।",
      highlight: true,
    },
    {
      id: "retractions-removal",
      hEn: "Retractions and Removal",
      hHi: "वापसी और हटाना",
      bEn:
        "In rare cases we may retract or remove an article — for example if it is found to be seriously inaccurate, or in response to valid legal requests. We assess such requests carefully.",
      bHi:
        "दुर्लभ मामलों में हम किसी लेख को वापस ले सकते हैं या हटा सकते हैं — उदाहरण के लिए यदि वह गंभीर रूप से गलत पाया जाए, या वैध कानूनी अनुरोधों के जवाब में। हम ऐसे अनुरोधों का सावधानीपूर्वक मूल्यांकन करते हैं।",
    },
    {
      id: "request",
      hEn: "Reader Correction Requests",
      hHi: "पाठक सुधार अनुरोध",
      bEn:
        "To request a correction, use our [Contact page](/contact-us) and select \"Suggest a correction\" or \"Report an error\". Please include the article link, the specific issue, and any supporting source if available. We review requests and respond as appropriate; we do not change article content based solely on an unverified request.",
      bHi:
        "सुधार का अनुरोध करने के लिए, हमारे [संपर्क पृष्ठ](/contact-us) का उपयोग करें और \"सुधार सुझाएँ\" या \"गलती की सूचना दें\" चुनें। कृपया लेख का लिंक, विशिष्ट समस्या, और यदि उपलब्ध हो तो कोई सहायक स्रोत शामिल करें। हम अनुरोधों की समीक्षा करते हैं और उपयुक्त रूप से उत्तर देते हैं; हम केवल असत्यापित अनुरोध के आधार पर लेख की सामग्री नहीं बदलते।",
    },
  ],
});

const ETHICS_POLICY = buildPage("ethics-policy", {
  summaryEn:
    "The principles that guide our journalism — honesty, independence, fairness, accountability and respect for people.",
  summaryHi:
    "वे सिद्धांत जो हमारी पत्रकारिता का मार्गदर्शन करते हैं — ईमानदारी, स्वतंत्रता, निष्पक्षता, जवाबदेही और लोगों के प्रति सम्मान।",
  seoDescEn:
    "News Junction ethics policy: honesty, independence, fairness, privacy, sensitive reporting, plagiarism, copyright, manipulated and AI-generated media.",
  seoDescHi:
    "News Junction नैतिकता नीति: ईमानदारी, स्वतंत्रता, निष्पक्षता, गोपनीयता, संवेदनशील रिपोर्टिंग, साहित्यिक चोरी, कॉपीराइट, परिवर्तित और एआई-निर्मित मीडिया।",
  sections: [
    {
      id: "principles",
      hEn: "Our Core Principles",
      hHi: "हमारे मूल सिद्धांत",
      bEn:
        "We are committed to public-interest journalism grounded in honesty, accuracy, independence, fairness and accountability. We take responsibility for what we publish.",
      bHi:
        "हम ईमानदारी, सटीकता, स्वतंत्रता, निष्पक्षता और जवाबदेही पर आधारित जनहित की पत्रकारिता के लिए प्रतिबद्ध हैं। हम जो प्रकाशित करते हैं उसकी ज़िम्मेदारी लेते हैं।",
    },
    {
      id: "respect",
      hEn: "Respect, Privacy and Non-Discrimination",
      hHi: "सम्मान, गोपनीयता और भेदभाव-रहितता",
      bEn:
        "We avoid discrimination and respect individual privacy. We take particular care with minors, victims and vulnerable people, and we report on suicide, self-harm and sexual violence responsibly and sensitively.",
      bHi:
        "हम भेदभाव से बचते हैं और व्यक्तिगत गोपनीयता का सम्मान करते हैं। हम नाबालिगों, पीड़ितों और कमज़ोर लोगों के मामले में विशेष सावधानी बरतते हैं, और आत्महत्या, आत्म-क्षति व यौन हिंसा पर ज़िम्मेदारी और संवेदनशीलता से रिपोर्ट करते हैं।",
    },
    {
      id: "accused",
      hEn: "Crime, Suspects and Presumption of Innocence",
      hHi: "अपराध, संदिग्ध और निर्दोषता की धारणा",
      bEn:
        "We respect the presumption of innocence for accused persons and avoid prejudging outcomes. We are careful when naming suspects and reporting allegations.",
      bHi:
        "हम अभियुक्तों के लिए निर्दोषता की धारणा का सम्मान करते हैं और परिणामों का पूर्वानुमान लगाने से बचते हैं। संदिग्धों के नाम बताते समय और आरोपों की रिपोर्टिंग करते समय हम सावधानी बरतते हैं।",
    },
    {
      id: "sensitivity",
      hEn: "Graphic Content, Hate Speech and Communal Sensitivity",
      hHi: "ग्राफ़िक सामग्री, घृणा भाषण और सांप्रदायिक संवेदनशीलता",
      bEn:
        "We handle graphic content responsibly and do not promote hate speech or extremism. We are mindful of religious and communal sensitivities and avoid content that incites hatred or violence.",
      bHi:
        "हम ग्राफ़िक सामग्री को ज़िम्मेदारी से संभालते हैं और घृणा भाषण या उग्रवाद को बढ़ावा नहीं देते। हम धार्मिक और सांप्रदायिक संवेदनशीलताओं का ध्यान रखते हैं और घृणा या हिंसा भड़काने वाली सामग्री से बचते हैं।",
    },
    {
      id: "integrity",
      hEn: "Conflicts, Gifts, Plagiarism and Copyright",
      hHi: "टकराव, उपहार, साहित्यिक चोरी और कॉपीराइट",
      bEn:
        "We avoid conflicts of interest and inappropriate gifts or payments that could influence coverage. We do not plagiarise, and we respect copyright, using third-party content only with permission or appropriate attribution.",
      bHi:
        "हम हितों के टकराव और ऐसे अनुचित उपहारों या भुगतानों से बचते हैं जो कवरेज को प्रभावित कर सकते हैं। हम साहित्यिक चोरी नहीं करते, और कॉपीराइट का सम्मान करते हैं — तृतीय-पक्ष सामग्री का उपयोग केवल अनुमति या उचित श्रेय के साथ करते हैं।",
    },
    {
      id: "media-integrity",
      hEn: "Manipulated and AI-Generated Media",
      hHi: "परिवर्तित और एआई-निर्मित मीडिया",
      bEn:
        "We do not use manipulated media to mislead. Where we use AI-generated images or media, we aim to label them appropriately. See our [AI Usage Policy](/ai-usage-policy).",
      bHi:
        "हम भ्रमित करने के लिए परिवर्तित मीडिया का उपयोग नहीं करते। जहाँ हम एआई-निर्मित छवियों या मीडिया का उपयोग करते हैं, वहाँ हम उन्हें उपयुक्त रूप से चिह्नित करने का प्रयास करते हैं। हमारी [एआई उपयोग नीति](/ai-usage-policy) देखें।",
      highlight: true,
    },
    {
      id: "advertising",
      hEn: "Advertising Separation and Transparency",
      hHi: "विज्ञापन पृथक्करण और पारदर्शिता",
      bEn:
        "We keep advertising separate from editorial content and label sponsored content clearly. We value transparency and welcome feedback and corrections through our [Contact page](/contact-us).",
      bHi:
        "हम विज्ञापन को संपादकीय सामग्री से अलग रखते हैं और प्रायोजित सामग्री को स्पष्ट रूप से चिह्नित करते हैं। हम पारदर्शिता को महत्व देते हैं और हमारे [संपर्क पृष्ठ](/contact-us) के माध्यम से प्रतिक्रिया व सुधार का स्वागत करते हैं।",
    },
  ],
});

const AI_USAGE_POLICY = buildPage("ai-usage-policy", {
  summaryEn:
    "How News Junction uses automation and AI, the human oversight involved, and how we disclose AI-assisted content.",
  summaryHi:
    "News Junction ऑटोमेशन और एआई का उपयोग कैसे करता है, इसमें मानव निगरानी की भूमिका, और हम एआई-सहायता प्राप्त सामग्री का खुलासा कैसे करते हैं।",
  seoDescEn:
    "News Junction AI usage policy: where AI assists, human oversight, disclosure labels, high-risk topics, AI-generated images and data sent to AI providers.",
  seoDescHi:
    "News Junction एआई उपयोग नीति: एआई कहाँ सहायता करता है, मानव निगरानी, खुलासा लेबल, उच्च-जोखिम विषय, एआई-निर्मित छवियाँ और एआई प्रदाताओं को भेजा गया डेटा।",
  sections: [
    {
      id: "why",
      hEn: "Why We Use AI",
      hHi: "हम एआई का उपयोग क्यों करते हैं",
      bEn:
        "As a bilingual, high-volume news platform, we use automation and AI to work efficiently — helping us discover topics, draft, translate and format content so we can cover more news in Hindi and English.",
      bHi:
        "एक द्विभाषी, उच्च-मात्रा वाले समाचार मंच के रूप में, हम कुशलता से काम करने के लिए ऑटोमेशन और एआई का उपयोग करते हैं — जो हमें विषय खोजने, ड्राफ्ट करने, अनुवाद करने और सामग्री को फ़ॉर्मैट करने में मदद करता है ताकि हम हिंदी और अंग्रेज़ी में अधिक खबरें कवर कर सकें।",
    },
    {
      id: "areas",
      hEn: "Where AI May Assist",
      hHi: "एआई कहाँ सहायता कर सकता है",
      bEn:
        "AI may assist with:\n\n- Topic discovery and trend detection\n- Draft generation and summarisation\n- Translation between Hindi and English\n- SEO metadata\n- Image generation and illustration\n- Audio, reel or video generation\n- Content classification and moderation\n- Personalisation of recommendations",
      bHi:
        "एआई इनमें सहायता कर सकता है:\n\n- विषय खोज और ट्रेंड पहचान\n- ड्राफ्ट निर्माण और सारांश\n- हिंदी और अंग्रेज़ी के बीच अनुवाद\n- एसईओ मेटाडेटा\n- छवि निर्माण और चित्रण\n- ऑडियो, रील या वीडियो निर्माण\n- सामग्री वर्गीकरण और मॉडरेशन\n- अनुशंसाओं का वैयक्तिकरण",
    },
    {
      id: "oversight",
      hEn: "Human Oversight and Quality Checks",
      hHi: "मानव निगरानी और गुणवत्ता जाँच",
      bEn:
        "AI-assisted content may be reviewed automatically or manually according to topic and risk level. Automated quality checks help flag issues, and higher-risk content can receive additional review. We do not automatically claim that content is \"editorially reviewed\" unless a review actually took place.",
      bHi:
        "एआई-सहायता प्राप्त सामग्री की समीक्षा विषय और जोखिम स्तर के अनुसार स्वचालित या मैन्युअल रूप से की जा सकती है। स्वचालित गुणवत्ता जाँच समस्याओं को चिह्नित करने में मदद करती है, और उच्च-जोखिम वाली सामग्री की अतिरिक्त समीक्षा हो सकती है। हम स्वतः यह दावा नहीं करते कि सामग्री \"संपादकीय रूप से समीक्षित\" है, जब तक कि वास्तव में समीक्षा न हुई हो।",
      highlight: true,
    },
    {
      id: "high-risk",
      hEn: "High-Risk Topics",
      hHi: "उच्च-जोखिम विषय",
      bEn:
        "We apply additional caution to high-risk areas — public figures, crime and allegations, health, legal and financial information. These topics are handled with extra care regarding accuracy and fairness.",
      bHi:
        "हम उच्च-जोखिम वाले क्षेत्रों — सार्वजनिक हस्तियाँ, अपराध व आरोप, स्वास्थ्य, कानूनी और वित्तीय जानकारी — पर अतिरिक्त सावधानी बरतते हैं। इन विषयों को सटीकता और निष्पक्षता के संबंध में अतिरिक्त सावधानी से संभाला जाता है।",
    },
    {
      id: "images",
      hEn: "AI-Generated Images and Synthetic Media",
      hHi: "एआई-निर्मित छवियाँ और सिंथेटिक मीडिया",
      bEn:
        "Some illustrations or images may be AI-generated. We aim to disclose AI-generated visuals where used and avoid using synthetic media to misrepresent real events or people.",
      bHi:
        "कुछ चित्र या छवियाँ एआई-निर्मित हो सकती हैं। जहाँ उपयोग किया जाए वहाँ हम एआई-निर्मित दृश्यों का खुलासा करने का प्रयास करते हैं और वास्तविक घटनाओं या लोगों को गलत रूप में प्रस्तुत करने के लिए सिंथेटिक मीडिया के उपयोग से बचते हैं।",
    },
    {
      id: "disclosure-labels",
      hEn: "Content Disclosure Labels",
      hHi: "सामग्री खुलासा लेबल",
      bEn:
        "Where applicable, articles may carry a disclosure such as: Human-written; AI-assisted; AI-generated draft, editorially reviewed; Automated translation; AI-generated illustration; AI-generated audio; or AI-generated video. We do not label content \"editorially reviewed\" unless a review record exists.",
      bHi:
        "जहाँ लागू हो, लेखों पर खुलासा हो सकता है जैसे: मानव-लिखित; एआई-सहायता प्राप्त; एआई-निर्मित ड्राफ्ट, संपादकीय रूप से समीक्षित; स्वचालित अनुवाद; एआई-निर्मित चित्रण; एआई-निर्मित ऑडियो; या एआई-निर्मित वीडियो। हम सामग्री को \"संपादकीय रूप से समीक्षित\" तब तक चिह्नित नहीं करते जब तक समीक्षा का रिकॉर्ड मौजूद न हो।",
    },
    {
      id: "data-privacy",
      hEn: "Data Sent to AI Providers and Privacy Safeguards",
      hHi: "एआई प्रदाताओं को भेजा गया डेटा और गोपनीयता सुरक्षा",
      bEn:
        "When we use third-party AI services, limited content necessary for the task may be sent to those providers. We do not publicly expose confidential prompts, API keys or internal model logs. See our [Privacy Policy](/privacy-policy) for how personal data is handled.",
      bHi:
        "जब हम तृतीय-पक्ष एआई सेवाओं का उपयोग करते हैं, तो कार्य के लिए आवश्यक सीमित सामग्री उन प्रदाताओं को भेजी जा सकती है। हम गोपनीय प्रॉम्प्ट, एपीआई कुंजियाँ या आंतरिक मॉडल लॉग सार्वजनिक रूप से उजागर नहीं करते। व्यक्तिगत डेटा को कैसे संभाला जाता है, इसके लिए हमारी [गोपनीयता नीति](/privacy-policy) देखें।",
    },
    {
      id: "errors",
      hEn: "Errors, Limitations and Feedback",
      hHi: "त्रुटियाँ, सीमाएँ और प्रतिक्रिया",
      bEn:
        "AI systems can make mistakes. If you notice an error in AI-assisted content, please report it via our [Contact page](/contact-us). We correct errors under our [Corrections Policy](/corrections-policy).",
      bHi:
        "एआई प्रणालियाँ गलतियाँ कर सकती हैं। यदि आपको एआई-सहायता प्राप्त सामग्री में कोई त्रुटि दिखे, तो कृपया हमारे [संपर्क पृष्ठ](/contact-us) के माध्यम से इसकी सूचना दें। हम अपनी [सुधार नीति](/corrections-policy) के तहत गलतियों को सुधारते हैं।",
    },
  ],
});

const OWNERSHIP_FUNDING = buildPage("ownership-and-funding", {
  summaryEn:
    "Who operates News Junction, who is responsible for editorial decisions, and how the platform is funded.",
  summaryHi:
    "News Junction को कौन संचालित करता है, संपादकीय निर्णयों के लिए कौन ज़िम्मेदार है, और मंच को कैसे वित्तपोषित किया जाता है।",
  seoDescEn:
    "Ownership and funding transparency for News Junction — ownership, editorial control, funding model, advertising and affiliate disclosures.",
  seoDescHi:
    "News Junction के लिए स्वामित्व और वित्तपोषण पारदर्शिता — स्वामित्व, संपादकीय नियंत्रण, वित्तपोषण मॉडल, विज्ञापन और सहबद्ध खुलासे।",
  sections: [
    {
      id: "intro",
      hEn: "Transparency of Ownership",
      hHi: "स्वामित्व की पारदर्शिता",
      bEn:
        "We believe readers should know who is behind the news they read and how it is funded. The details below are provided for transparency. Ownership and legal-entity details are shown when configured.",
      bHi:
        "हमारा मानना है कि पाठकों को यह जानना चाहिए कि वे जो खबरें पढ़ते हैं उनके पीछे कौन है और उन्हें कैसे वित्तपोषित किया जाता है। नीचे दिए गए विवरण पारदर्शिता के लिए प्रदान किए गए हैं। स्वामित्व और कानूनी-इकाई विवरण कॉन्फ़िगर होने पर दिखाए जाते हैं।",
    },
    {
      id: "editorial-control",
      hEn: "Editorial Control",
      hHi: "संपादकीय नियंत्रण",
      bEn:
        "Editorial decisions are made independently of commercial interests. Responsibility for editorial standards rests with the editorial lead identified below (where configured).",
      bHi:
        "संपादकीय निर्णय वाणिज्यिक हितों से स्वतंत्र रूप से लिए जाते हैं। संपादकीय मानकों की ज़िम्मेदारी नीचे पहचाने गए संपादकीय प्रमुख (जहाँ कॉन्फ़िगर हो) की होती है।",
    },
    {
      id: "funding",
      hEn: "Funding Model",
      hHi: "वित्तपोषण मॉडल",
      bEn:
        "Our funding sources are disclosed below where configured. Revenue does not influence our editorial coverage. Advertising and any affiliate relationships are disclosed transparently.",
      bHi:
        "जहाँ कॉन्फ़िगर हो, हमारे वित्तपोषण स्रोत नीचे प्रकट किए गए हैं। राजस्व हमारी संपादकीय कवरेज को प्रभावित नहीं करता। विज्ञापन और कोई भी सहबद्ध संबंध पारदर्शी रूप से प्रकट किए जाते हैं।",
    },
    {
      id: "contact",
      hEn: "Ownership Queries",
      hHi: "स्वामित्व संबंधी प्रश्न",
      bEn:
        "For questions about ownership or funding, please use the contact details shown below or reach us through our [Contact page](/contact-us).",
      bHi:
        "स्वामित्व या वित्तपोषण के बारे में प्रश्नों के लिए, कृपया नीचे दिखाए गए संपर्क विवरण का उपयोग करें या हमारे [संपर्क पृष्ठ](/contact-us) के माध्यम से हमसे संपर्क करें।",
    },
  ],
});

const PRIVACY_POLICY = buildPage("privacy-policy", {
  summaryEn:
    "How News Junction collects, uses, shares and protects information when you use our website and services.",
  summaryHi:
    "जब आप हमारी वेबसाइट और सेवाओं का उपयोग करते हैं तो News Junction जानकारी कैसे एकत्र, उपयोग, साझा और सुरक्षित करता है।",
  seoDescEn:
    "News Junction privacy policy — information we collect, cookies, analytics (Google Analytics, Microsoft Clarity), authentication, AI services, retention and your rights.",
  seoDescHi:
    "News Junction गोपनीयता नीति — हम कौन-सी जानकारी एकत्र करते हैं, कुकीज़, एनालिटिक्स (Google Analytics, Microsoft Clarity), प्रमाणीकरण, एआई सेवाएँ, प्रतिधारण और आपके अधिकार।",
  sections: [
    {
      id: "intro",
      hEn: "Introduction",
      hHi: "परिचय",
      bEn:
        "This Privacy Policy explains how News Junction (\"we\", \"us\", \"our\") collects, uses and protects information when you use our website and related services. By using the site, you agree to the practices described here.",
      bHi:
        "यह गोपनीयता नीति बताती है कि जब आप हमारी वेबसाइट और संबंधित सेवाओं का उपयोग करते हैं तो News Junction (\"हम\", \"हमें\", \"हमारा\") जानकारी कैसे एकत्र, उपयोग और सुरक्षित करता है। साइट का उपयोग करके, आप यहाँ वर्णित प्रथाओं से सहमत होते हैं।",
    },
    {
      id: "info-collected",
      hEn: "Information We Collect",
      hHi: "हम कौन-सी जानकारी एकत्र करते हैं",
      bEn:
        "- **Information you provide**: messages sent through our contact form (name, email, optional phone, subject and message), and account details if you sign in.\n- **Automatically collected**: usage data such as pages visited, device and browser information, IP address, and approximate location, collected via cookies and similar technologies.\n- **Preferences**: language and location preferences you set on the site.",
      bHi:
        "- **आपके द्वारा दी गई जानकारी**: हमारे संपर्क फ़ॉर्म के माध्यम से भेजे गए संदेश (नाम, ईमेल, वैकल्पिक फ़ोन, विषय और संदेश), और साइन इन करने पर खाता विवरण।\n- **स्वचालित रूप से एकत्रित**: उपयोग डेटा जैसे देखे गए पृष्ठ, डिवाइस व ब्राउज़र जानकारी, आईपी पता, और अनुमानित स्थान, जो कुकीज़ और समान तकनीकों के माध्यम से एकत्र किया जाता है।\n- **प्राथमिकताएँ**: साइट पर आपके द्वारा सेट की गई भाषा और स्थान प्राथमिकताएँ।",
    },
    {
      id: "cookies-analytics",
      hEn: "Cookies and Analytics",
      hHi: "कुकीज़ और एनालिटिक्स",
      bEn:
        "We use cookies and similar technologies to operate the site and understand usage. Where enabled, we use analytics services such as Google Analytics and Microsoft Clarity to measure traffic and improve the experience. These services may set their own cookies and collect usage data subject to their own privacy policies.",
      bHi:
        "हम साइट संचालित करने और उपयोग समझने के लिए कुकीज़ और समान तकनीकों का उपयोग करते हैं। जहाँ सक्षम हो, हम ट्रैफ़िक मापने और अनुभव सुधारने के लिए Google Analytics और Microsoft Clarity जैसी एनालिटिक्स सेवाओं का उपयोग करते हैं। ये सेवाएँ अपनी स्वयं की कुकीज़ सेट कर सकती हैं और अपनी गोपनीयता नीतियों के अधीन उपयोग डेटा एकत्र कर सकती हैं।",
    },
    {
      id: "purpose",
      hEn: "How We Use Information",
      hHi: "हम जानकारी का उपयोग कैसे करते हैं",
      bEn:
        "We use information to deliver and improve our news service, respond to enquiries and correction requests, personalise content where applicable, maintain security, and comply with legal obligations.",
      bHi:
        "हम जानकारी का उपयोग अपनी समाचार सेवा प्रदान करने व सुधारने, पूछताछ और सुधार अनुरोधों का उत्तर देने, जहाँ लागू हो वहाँ सामग्री को वैयक्तिकृत करने, सुरक्षा बनाए रखने, और कानूनी दायित्वों का पालन करने के लिए करते हैं।",
    },
    {
      id: "sharing",
      hEn: "Data Sharing and Third-Party Processors",
      hHi: "डेटा साझाकरण और तृतीय-पक्ष प्रोसेसर",
      bEn:
        "We do not sell personal data. We use trusted service providers to operate the site, which may include: Firebase / Google Cloud (authentication, database and storage), Vercel (hosting), analytics providers (Google Analytics, Microsoft Clarity), and AI service providers used in our content workflow. We may disclose information where required by law.",
      bHi:
        "हम व्यक्तिगत डेटा नहीं बेचते। साइट संचालित करने के लिए हम विश्वसनीय सेवा प्रदाताओं का उपयोग करते हैं, जिनमें शामिल हो सकते हैं: Firebase / Google Cloud (प्रमाणीकरण, डेटाबेस और स्टोरेज), Vercel (होस्टिंग), एनालिटिक्स प्रदाता (Google Analytics, Microsoft Clarity), और हमारी सामग्री प्रक्रिया में उपयोग किए जाने वाले एआई सेवा प्रदाता। कानून द्वारा आवश्यक होने पर हम जानकारी प्रकट कर सकते हैं।",
    },
    {
      id: "retention-security",
      hEn: "Data Retention and Security",
      hHi: "डेटा प्रतिधारण और सुरक्षा",
      bEn:
        "We retain information only as long as needed for the purposes described or as required by law. We use reasonable technical and organisational measures to protect data, including access controls and encryption in transit. No method of transmission or storage is completely secure.",
      bHi:
        "हम जानकारी केवल तब तक रखते हैं जब तक वर्णित उद्देश्यों के लिए आवश्यक हो या कानून द्वारा अपेक्षित हो। हम डेटा की सुरक्षा के लिए उचित तकनीकी और संगठनात्मक उपायों का उपयोग करते हैं, जिनमें एक्सेस नियंत्रण और ट्रांज़िट में एन्क्रिप्शन शामिल हैं। संचरण या भंडारण की कोई भी विधि पूर्णतः सुरक्षित नहीं है।",
    },
    {
      id: "your-rights",
      hEn: "Your Choices and Rights",
      hHi: "आपके विकल्प और अधिकार",
      bEn:
        "Depending on your location, you may request access to, correction of, or deletion of your personal data. You can manage cookies through your browser settings. To make a request, contact us using the privacy contact details on our [Contact page](/contact-us).",
      bHi:
        "आपके स्थान के आधार पर, आप अपने व्यक्तिगत डेटा तक पहुँच, सुधार, या हटाने का अनुरोध कर सकते हैं। आप अपने ब्राउज़र सेटिंग्स के माध्यम से कुकीज़ प्रबंधित कर सकते हैं। अनुरोध करने के लिए, हमारे [संपर्क पृष्ठ](/contact-us) पर गोपनीयता संपर्क विवरण का उपयोग करके हमसे संपर्क करें।",
    },
    {
      id: "children-links",
      hEn: "Children, External Links and International Processing",
      hHi: "बच्चे, बाहरी लिंक और अंतर्राष्ट्रीय प्रसंस्करण",
      bEn:
        "Our service is intended for a general audience and is not directed at children. Our site may link to third-party websites whose privacy practices we do not control. Data may be processed on servers located outside your country by our service providers.",
      bHi:
        "हमारी सेवा एक सामान्य दर्शक वर्ग के लिए है और बच्चों के लिए निर्देशित नहीं है। हमारी साइट तृतीय-पक्ष वेबसाइटों से लिंक कर सकती है जिनकी गोपनीयता प्रथाओं को हम नियंत्रित नहीं करते। हमारे सेवा प्रदाताओं द्वारा डेटा आपके देश के बाहर स्थित सर्वरों पर संसाधित किया जा सकता है।",
    },
    {
      id: "changes-contact",
      hEn: "Changes and Grievance Contact",
      hHi: "परिवर्तन और शिकायत संपर्क",
      bEn:
        "We may update this policy from time to time; the \"Last updated\" date reflects the latest version. For privacy questions or grievances, please use the privacy/grievance contact details shown on our [Contact page](/contact-us).",
      bHi:
        "हम इस नीति को समय-समय पर अपडेट कर सकते हैं; \"अंतिम अपडेट\" तिथि नवीनतम संस्करण को दर्शाती है। गोपनीयता प्रश्नों या शिकायतों के लिए, कृपया हमारे [संपर्क पृष्ठ](/contact-us) पर दिखाए गए गोपनीयता/शिकायत संपर्क विवरण का उपयोग करें।",
    },
  ],
});

const TERMS_AND_CONDITIONS = buildPage("terms-and-conditions", {
  summaryEn:
    "The terms that govern your use of the News Junction website and services.",
  summaryHi:
    "वे शर्तें जो News Junction वेबसाइट और सेवाओं के आपके उपयोग को नियंत्रित करती हैं।",
  seoDescEn:
    "News Junction terms and conditions — acceptance, use of content, intellectual property, AI-assisted content, disclaimers, liability and governing law.",
  seoDescHi:
    "News Junction नियम और शर्तें — स्वीकृति, सामग्री का उपयोग, बौद्धिक संपदा, एआई-सहायता प्राप्त सामग्री, अस्वीकरण, दायित्व और शासी कानून।",
  sections: [
    {
      id: "acceptance",
      hEn: "Acceptance of Terms",
      hHi: "शर्तों की स्वीकृति",
      bEn:
        "By accessing or using News Junction, you agree to these Terms and Conditions. If you do not agree, please do not use the site.",
      bHi:
        "News Junction तक पहुँच कर या उसका उपयोग करके, आप इन नियमों और शर्तों से सहमत होते हैं। यदि आप सहमत नहीं हैं, तो कृपया साइट का उपयोग न करें।",
    },
    {
      id: "purpose",
      hEn: "Website Purpose and No Professional Advice",
      hHi: "वेबसाइट का उद्देश्य और कोई पेशेवर सलाह नहीं",
      bEn:
        "News Junction provides news and informational content in Hindi and English. Content is for general information only and is not professional, legal, medical or financial advice. We strive for accuracy but do not guarantee completeness, and breaking-news content may be updated as events develop.",
      bHi:
        "News Junction हिंदी और अंग्रेज़ी में समाचार और सूचनात्मक सामग्री प्रदान करता है। सामग्री केवल सामान्य जानकारी के लिए है और यह पेशेवर, कानूनी, चिकित्सा या वित्तीय सलाह नहीं है। हम सटीकता का प्रयास करते हैं लेकिन पूर्णता की गारंटी नहीं देते, और ब्रेकिंग-न्यूज़ सामग्री घटनाओं के विकसित होने के साथ अपडेट की जा सकती है।",
    },
    {
      id: "user-conduct",
      hEn: "User Conduct",
      hHi: "उपयोगकर्ता आचरण",
      bEn:
        "You agree not to misuse the site, attempt unauthorised access, disrupt services, or use the site for unlawful purposes.",
      bHi:
        "आप साइट का दुरुपयोग न करने, अनधिकृत पहुँच का प्रयास न करने, सेवाओं में बाधा न डालने, या साइट का उपयोग गैरकानूनी उद्देश्यों के लिए न करने से सहमत हैं।",
    },
    {
      id: "ip",
      hEn: "Intellectual Property and Prohibited Copying",
      hHi: "बौद्धिक संपदा और निषिद्ध नकल",
      bEn:
        "Content on this site is protected by applicable intellectual property laws. You may access content for personal, non-commercial use. Republishing, large-scale copying, scraping or automated harvesting of content without permission is prohibited.",
      bHi:
        "इस साइट की सामग्री लागू बौद्धिक संपदा कानूनों द्वारा संरक्षित है। आप व्यक्तिगत, गैर-वाणिज्यिक उपयोग के लिए सामग्री तक पहुँच सकते हैं। अनुमति के बिना सामग्री का पुनःप्रकाशन, बड़े पैमाने पर नकल, स्क्रैपिंग या स्वचालित संग्रहण निषिद्ध है।",
    },
    {
      id: "third-party-ads",
      hEn: "External Links, Third-Party Services and Advertising",
      hHi: "बाहरी लिंक, तृतीय-पक्ष सेवाएँ और विज्ञापन",
      bEn:
        "The site may contain links to third-party websites and integrate third-party services. We are not responsible for their content or practices. The site may display advertising, and any affiliate relationships will be disclosed where applicable.",
      bHi:
        "साइट में तृतीय-पक्ष वेबसाइटों के लिंक हो सकते हैं और तृतीय-पक्ष सेवाओं को एकीकृत किया जा सकता है। हम उनकी सामग्री या प्रथाओं के लिए ज़िम्मेदार नहीं हैं। साइट विज्ञापन प्रदर्शित कर सकती है, और जहाँ लागू हो वहाँ कोई भी सहबद्ध संबंध प्रकट किए जाएँगे।",
    },
    {
      id: "ai-content",
      hEn: "AI-Generated and AI-Assisted Content",
      hHi: "एआई-निर्मित और एआई-सहायता प्राप्त सामग्री",
      bEn:
        "Some content is produced with automation and AI assistance and may contain errors. Please see our [AI Usage Policy](/ai-usage-policy). Report any errors via our [Contact page](/contact-us).",
      bHi:
        "कुछ सामग्री ऑटोमेशन और एआई सहायता से तैयार की जाती है और इसमें त्रुटियाँ हो सकती हैं। कृपया हमारी [एआई उपयोग नीति](/ai-usage-policy) देखें। किसी भी त्रुटि की सूचना हमारे [संपर्क पृष्ठ](/contact-us) के माध्यम से दें।",
    },
    {
      id: "disclaimer",
      hEn: "Disclaimer, Limitation of Liability and Indemnity",
      hHi: "अस्वीकरण, दायित्व की सीमा और क्षतिपूर्ति",
      bEn:
        "The service is provided \"as is\" and \"as available\" to the extent permitted by law. To the maximum extent permitted by applicable law, News Junction is not liable for indirect, incidental or consequential damages arising from use of the site. You agree to indemnify News Junction against claims arising from your misuse of the site or violation of these terms.",
      bHi:
        "सेवा कानून द्वारा अनुमत सीमा तक \"जैसी है\" और \"जैसी उपलब्ध है\" के आधार पर प्रदान की जाती है। लागू कानून द्वारा अनुमत अधिकतम सीमा तक, News Junction साइट के उपयोग से उत्पन्न अप्रत्यक्ष, आकस्मिक या परिणामी क्षति के लिए उत्तरदायी नहीं है। आप साइट के दुरुपयोग या इन शर्तों के उल्लंघन से उत्पन्न दावों के विरुद्ध News Junction की क्षतिपूर्ति करने के लिए सहमत हैं।",
    },
    {
      id: "governing-law",
      hEn: "Governing Law and Jurisdiction",
      hHi: "शासी कानून और अधिकार क्षेत्र",
      bEn:
        "These terms are governed by the applicable law and jurisdiction shown below (where configured by the site operator). We may update these terms from time to time; continued use after changes means you accept the revised terms.",
      bHi:
        "ये शर्तें नीचे दिखाए गए लागू कानून और अधिकार क्षेत्र (जहाँ साइट संचालक द्वारा कॉन्फ़िगर किया गया हो) द्वारा शासित हैं। हम इन शर्तों को समय-समय पर अपडेट कर सकते हैं; परिवर्तनों के बाद निरंतर उपयोग का अर्थ है कि आप संशोधित शर्तों को स्वीकार करते हैं।",
    },
  ],
});

export const DEFAULT_SITE_PAGES: Record<SitePageKey, SitePage> = {
  "about-us": ABOUT_US,
  "editorial-policy": EDITORIAL_POLICY,
  "fact-checking-policy": FACT_CHECKING_POLICY,
  "corrections-policy": CORRECTIONS_POLICY,
  "ethics-policy": ETHICS_POLICY,
  "ownership-and-funding": OWNERSHIP_FUNDING,
  "privacy-policy": PRIVACY_POLICY,
  "terms-and-conditions": TERMS_AND_CONDITIONS,
  "ai-usage-policy": AI_USAGE_POLICY,
};

export function getDefaultSitePage(key: SitePageKey): SitePage {
  return DEFAULT_SITE_PAGES[key];
}
