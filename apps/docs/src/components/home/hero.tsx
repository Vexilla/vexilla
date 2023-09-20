export function HomeHero() {
  return (
    <section className="text-normal body-font">
      <div className="container mx-auto flex px-5 py-24 md:flex-row flex-col items-center">
        <div className="lg:flex-grow md:w-1/2 lg:pr-24 md:pr-16 flex flex-col md:items-start md:text-left mb-16 md:mb-0 items-center text-center">
          <h1 className="title-font sm:text-4xl text-3xl mb-4 font-medium text-emphasis">
            Feature Flags for Everyone
          </h1>
          <p className="mb-8 leading-relaxed">
            Many services are just too expensive. Self-hosting is an option, but
            that can get expensive, too. Vexilla allows publishing flags as a
            static file wherever you want.
          </p>
          <div className="flex flex-row md:flex-col xl:flex-row justify-center gap-4">
            <a
              href="/documentation/getting-started"
              className="inline-flex text-gray-700 bg-gray-100 border-0 py-2 px-6  hover:bg-gray-200 rounded text-lg"
            >
              Getting Started
            </a>
            <a
              className="inline-flex text-white bg-primary-500 border-0 py-2 px-6  hover:bg-primary-600 rounded text-lg"
              href="https://app.vexilla.dev"
            >
              Launch the App
            </a>
          </div>
        </div>
        <div className="xl:max-w-xl 2xl:w-full hidden md:flex md:w-1/2">
          <img
            className="object-cover object-center rounded"
            alt="hero"
            src="/img/traffic-light-green.svg"
            width="720"
            height="600"
          />
        </div>
      </div>
    </section>
  );
}
