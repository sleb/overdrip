import { render } from "ink";
import Layout from "./components/layout";
import SetupScreen from "./components/setup-screen";

export const PAGES = ["setup"] as const;
export type Page = (typeof PAGES)[number];

type Props = { page: Page };
const App = ({ page }: Props) => {
  return <Layout>{page === "setup" ? <SetupScreen /> : null}</Layout>;
};

export const app = (page: Page) => {
  render(<App page={page} />);
};
