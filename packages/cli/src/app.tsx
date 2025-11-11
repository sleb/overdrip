import { render } from "ink";
import Layout from "./components/layout";
import OAuthSetupScreen from "./components/oauth-setup-screen";
import StartScreen from "./components/start-screen";

export const PAGES = ["setup", "start"] as const;
export type Page = (typeof PAGES)[number];

type Props = { page: Page };
const App = ({ page }: Props) => {
  return (
    <Layout>
      {page === "setup" ? <OAuthSetupScreen /> : null}
      {page === "start" ? <StartScreen /> : null}
    </Layout>
  );
};

export const app = (page: Page) => {
  render(<App page={page} />);
};
