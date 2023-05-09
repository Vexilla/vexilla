export default function HomeFeatureFlags() {
  return (
    <section className="text-gray-600 body-font" id="feature-flags">
      <div className="container px-5 py-24 mx-auto flex flex-wrap">
        <h2 className="sm:text-3xl text-2xl text-gray-900 font-medium title-font mb-2 md:w-2/5">
          What can feature flags do for you and your users?
        </h2>
        <div className="md:w-3/5 md:pl-6">
          <p className="leading-relaxed text-base">
            Many popular applications use feature flags to roll out and test new
            functionality without having to redeploy the app and its assets.
            Learn more about why feature flags are so useful at featureflags.io
            or Wikipedia.
          </p>
          <div className="flex md:mt-4 mt-6">
            <a
              className="inline-flex text-white bg-indigo-500 border-0 py-1 px-4 focus:outline-none hover:bg-indigo-600 rounded"
              href="https://featureflags.io"
              target="_blank"
            >
              featureflags.io
            </a>
            <a
              className="text-indigo-500 inline-flex items-center ml-4"
              href="https://en.wikipedia.org/wiki/Feature_toggle"
              target="_blank"
            >
              Wikipedia
              <svg
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="w-4 h-4 ml-2"
                viewBox="0 0 24 24"
              >
                <path d="M5 12h14M12 5l7 7-7 7"></path>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
