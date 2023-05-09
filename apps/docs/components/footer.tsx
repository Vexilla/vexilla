import styled from "styled-components";
import tw from "twin.macro";

const Wrapper = styled.footer`
  ${tw`flex flex-row space-x-3 p-8 pt-12 items-center justify-center`}
`;

export default function Footer() {
  return (
    <Wrapper>
      <span>©2021 Vexilla</span>
      <a href="https://opensource.org/licenses/MIT">MIT License</a>
    </Wrapper>
  );
}
