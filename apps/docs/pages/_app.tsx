import GlobalStyles from "components/GlobalStyles";
import React from "react";

import { MDXProvider } from "@mdx-js/react";
import Highlight, { defaultProps } from "prism-react-renderer";
import Theme from "prism-react-renderer/themes/duotoneLight";

console.log({ Theme });

// duotoneLight specific overrides
Theme.plain.color = "#3b82f6";
Theme.styles[0].style.color = "#56563E";
Theme.styles[0].style.fontStyle = "italic";
Theme.styles[3].style.color = "#645330";
Theme.styles[6].style.color = "#043e9c";

import "tailwindcss/tailwind.css";
import "styles/prism-coy.css";
import "styles/index.css";

function VexillaDocsApp({ Component, pageProps }) {
  return (
    <MDXProvider components={components}>
      <div className="relative pt-32 md:pt-20 bg-white max-w-screen-lg mx-auto">
        <GlobalStyles />
        <Component {...pageProps} />
      </div>
    </MDXProvider>
  );
}

export default VexillaDocsApp;

const components = {
  code: ({ className, children, language }) => {
    language = language || className.replace(/language-/, "");
    return (
      <>
        <Highlight
          {...defaultProps}
          code={children}
          language={language}
          theme={Theme}
        >
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre className={className} style={style}>
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line, key: i })}>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token, key })} />
                  ))}
                </div>
              ))}
            </pre>
          )}
        </Highlight>
        <style jsx global>{``}</style>
      </>
    );
  },
};
