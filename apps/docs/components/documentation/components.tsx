import styled from "styled-components";
import tw from "twin.macro";
// import Link from "components/link";
import Link from "next/link";

export const ContentSection = styled.section`
  ${tw`px-24 py-20`}
`;

const ClientLanguage = styled.span`
  ${tw`font-bold inline-block`}

  width: 100px;
  margin-top: 0 !important;
`;

const clients = [
  {
    language: "JS/TS",
    github: "https://github.com/vexilla/client-js",
    repository: "npm",
    repositoryLink: "https://npmjs.org/@vexilla/client",
  },
  {
    language: "Elixir",
    github: "https://github.com/vexilla/client-elixir",
    repository: "hex.pm",
    repositoryLink: "https://hex.pm/packages/vexilla_client_elixir",
  },
  {
    language: "PHP",
    github: "https://github.com/vexilla/client-php",
    repository: "Packagist",
    repositoryLink: "https://packagist.org/packages/vexilla/client",
  },
  {
    language: "Python",
    github: "https://github.com/vexilla/client-python",
    repository: "pypi",
    repositoryLink: "https://pypi.org/project/vexilla-client/",
  },
  {
    language: "C#",
    github: "https://github.com/vexilla/client-csharp",
    repository: "NuGet",
    repositoryLink: "https://www.nuget.org/packages/Vexilla.Client",
  },
  {
    language: "Go",
    github: "https://github.com/vexilla/client-go",
    repository: "pkg.go.dev",
    repositoryLink: "https://pkg.go.dev/github.com/vexilla/client-go",
  },
  {
    language: "Rust",
    github: "https://github.com/vexilla/client-rust",
    repository: "crates.io",
    repositoryLink: "https://crates.io/vexilla_client",
  },
  {
    language: "Ruby",
    github: "https://github.com/vexilla/client-ruby",
    repository: "RubyGems",
    repositoryLink: "https://rubygems.org/gems/vexilla_client",
  },
  {
    language: "lua",
    github: "https://github.com/vexilla/client-lua",
    repository: "luarocks",
    repositoryLink: "https://luarocks.org/modules/cmgriffing/vexilla_client",
  },
  {
    language: "Dart",
    github: "https://github.com/vexilla/client-dart",
    repository: "pub.dev",
    repositoryLink: "https://pub.dev/packages/vexilla_client",
  },
  {
    language: "Kotlin (Java)",
    github: "https://github.com/vexilla/client-kotlin",
    repository: "Maven",
    repositoryLink: "",
  },
];

export function ClientLibraries() {
  return (
    <ul>
      {clients.map((client) => {
        return (
          client.repositoryLink && (
            <li>
              <ClientLanguage>{client.language}</ClientLanguage>
              <a className="mx-2" href={client.github} target="_blank">
                Github
              </a>
              <a className="mx-2" href={client.repositoryLink} target="_blank">
                {client.repository}
              </a>
            </li>
          )
        );
      })}
    </ul>
  );
}

export function Recipes() {
  return (
    <ul>
      <li>
        <Link href="/documentation/recipes/caching">
          Caching - Long Polling
        </Link>
      </li>
      <li>
        <Link href="/documentation/recipes/response-codes">
          Server Status Codes
        </Link>
      </li>
    </ul>
  );
}
