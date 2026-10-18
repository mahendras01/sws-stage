import Link from "next/link";
import InfoPageShell from "@/components/InfoPageShell";

export default function PrivacyPolicyPage() {
  return (
    <InfoPageShell
      title="गोपनीयता नीति"
      intro="यह गोपनीयता नीति बताती है कि Self-Welfare Society प्लेटफ़ॉर्म के माध्यम से प्रस्तुत व्यक्तिगत और वित्तीय जानकारी का प्रबंधन कैसे किया जाता है।"
      breadcrumb={[{ label: "गोपनीयता नीति", href: "/privacy-policy" }]}
    >
      <div className="grid gap-6">
        <div className="card space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">1. एकत्रित की जाने वाली जानकारी</h2>
          <p className="text-sm leading-7 text-slate-700">
            हम पंजीकरण संसाधित करने, पहचान सत्यापित करने, कल्याण रिकॉर्ड बनाए रखने और सेवा प्रदान करने के लिए आवश्यक जानकारी एकत्र करते हैं। इसमें व्यक्तिगत विवरण, पता जानकारी, संपर्क जानकारी, KYC विवरण, बैंक विवरण और सोसाइटी की गतिविधियों से संबंधित खाता उपयोग डेटा शामिल हो सकता है।
          </p>
        </div>

        <div className="card space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">2. जानकारी का उपयोग</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700">
            <li>पात्रता सत्यापन और सदस्य पंजीकरण की स्वीकृति के लिए।</li>
            <li>कल्याण दावे, सहायता अनुरोधों और योगदानों के प्रबंधन के लिए।</li>
            <li>सटीक सदस्यता और वित्तीय रिकॉर्ड बनाए रखने के लिए।</li>
            <li>सेवा अपडेट, स्वीकृतियाँ और संबंधित संचालनात्मक नोटिस साझा करने के लिए।</li>
          </ul>
        </div>

        <div className="card space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">3. सुरक्षा और पहुँच</h2>
          <p className="text-sm leading-7 text-slate-700">
            हम डेटा को अनधिकृत पहुँच, दुरुपयोग, परिवर्तन, प्रकटीकरण या हानि से बचाने के लिए उचित तकनीकी और प्रशासनिक सुरक्षा उपाय लागू करते हैं। पहुँच केवल अधिकृत प्रशासकों और उन प्रक्रियाओं तक सीमित होती है जिनकी सोसाइटी की स्वीकृत गतिविधियों के लिए आवश्यकता होती है।
          </p>
        </div>

        <div className="card space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">4. डेटा प्रतिधारण</h2>
          <p className="text-sm leading-7 text-slate-700">
            जानकारी केवल तभी रखी जाती है जब तक कि सदस्य सहायता, अनुपालन, ऑडिट, रिकॉर्ड-केपिंग और निरंतर सेवा वितरण की आवश्यकता बनी रहे। रिकॉर्ड सोसाइटी के शासन और कानूनी आवश्यकताओं के अनुसार हटाए या संग्रहीत किए जा सकते हैं।
          </p>
        </div>

        <div className="card space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">5. अधिकार और सहमति</h2>
          <p className="text-sm leading-7 text-slate-700">
            पंजीकरण के माध्यम से, आप इस नीति और सोसाइटी की परिचालन आवश्यकताओं के अनुरूप अपनी व्यक्तिगत जानकारी के संग्रहण और उपयोग की सहमति देते हैं। आप आवश्यक होने पर संबंधित जानकारी को स्पष्ट करने या अपडेट करने के लिए प्रशासकों से संपर्क कर सकते हैं।
          </p>
        </div>

        <div className="mt-2 flex flex-wrap gap-3">
          <Link href="/signup" className="btn-primary inline-block">
            पंजीकरण पर वापस जाएं
          </Link>
          <Link href="/terms" className="btn-secondary inline-block">
            नियम और शर्तें पढ़ें
          </Link>
        </div>
      </div>
    </InfoPageShell>
  );
}
