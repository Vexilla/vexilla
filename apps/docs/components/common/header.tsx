import styled from "styled-components";
import tw from "twin.macro";

export const Nav = styled.nav`
  ${tw`md:mr-auto md:ml-4 md:py-1 md:pl-4 md:border-l md:border-gray-400	flex flex-wrap items-center text-base justify-center`}
`;

export const InnerLink = styled.a`
  ${tw`mr-5 hover:text-gray-900`}
`;
