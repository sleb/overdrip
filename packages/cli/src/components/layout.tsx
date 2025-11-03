import { Box } from "ink";
import BigText from "ink-big-text";
import Gradient from "ink-gradient";
import type { ReactNode } from "react";

type Props = { children: ReactNode };
const Layout = ({ children }: Props) => {
  return (
    <Box flexDirection="column">
      <Gradient name="atlas">
        <BigText text="Overdrip" font="tiny" />
      </Gradient>
      {children}
    </Box>
  );
};

export default Layout;
