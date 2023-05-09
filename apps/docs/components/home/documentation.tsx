export default function HomeDocumentation() {
  return (
    <section className="text-gray-600 body-font" id="documentation">
      <div className="container px-5 py-24 mx-auto flex flex-wrap">
        <h2 className="sm:text-3xl text-2xl text-gray-900 font-medium title-font mb-2 md:w-2/5">
          There isn't that much to learn, but you still want to have a firm
          grasp on the capabilities. Read the docs!
        </h2>
        <div className="md:w-3/5 md:pl-6">
          <p className="leading-relaxed text-base">
            We have compiled a comprehensive collection of documentation and
            FAQs that can help you get up and running with the least amount of
            effort.
          </p>
          <div className="flex md:mt-4 mt-6">
            <a
              className="inline-flex text-white bg-indigo-500 border-0 py-1 px-4 focus:outline-none hover:bg-indigo-600 rounded"
              href="/documentation"
            >
              Documentation
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
