import { render } from "ink";
import ConfigShowScreen from "./components/config-show-screen";
import ConfigVerifyScreen from "./components/config-verify-screen";
import Layout from "./components/layout";
import OAuthSetupScreen from "./components/oauth-setup-screen";
import StartScreen from "./components/start-screen";

export const PAGES = ["setup", "start", "config:verify", "config:show"] as const;
export type Page = (typeof PAGES)[number];

type Props = { page: Page; };
const App = ({ page }: Props) => {
  console.log(page);
  return (
    <Layout>
      {page === "setup" && <OAuthSetupScreen />}
      {page === "start" && <StartScreen />}
      {page === "config:verify" && <ConfigVerifyScreen />}
      {page === "config:show" && <ConfigShowScreen />}
    </Layout>
  );
};

export const app = (page: Page) => {
  render(<App page={page} />);
};
