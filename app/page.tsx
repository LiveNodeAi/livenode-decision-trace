"use client";

import { useEffect, useState } from "react";
import { DecisionTraceApp } from "@/components/decision-trace-app";
import { uiStrings, type UiLanguage } from "@/lib/ui-strings";

export default function Page() {
  const [language, setLanguage] = useState<UiLanguage>("ja");
  useEffect(() => {
    setLanguage(new URLSearchParams(window.location.search).get("lang") === "en" ? "en" : "ja");
  }, []);
  const strings = uiStrings[language];
  return (
    <main>
      <header className="masthead">
        <a className="language-toggle" href={strings.languageHref} hrefLang={language === "ja" ? "en" : "ja"}>{strings.languageLink}</a>
        <p className="eyebrow">LIVENODE / EVIDENCE INSTRUMENT 01</p>
        <h1 aria-label="LiveNode Decision Trace"><span aria-hidden="true">LiveNode </span><span aria-hidden="true" className="title-main">Decision <i>Trace</i></span></h1>
        <p className="lede">{strings.lede}</p>
      </header>
      <DecisionTraceApp uiLanguage={language} />
    </main>
  );
}
