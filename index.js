// TODO
// Login
// re-login on expired session
// Commands
// /help
// /layout auto
// /layout focus
// /pin
// /version
// /upgrade
// /restart
// /mic toggle
// /mic on
// /mic off
// /cam toggle
// /cam off
// /cam on
// /cam list
// /cam 0
// /cam 1
// /mic list
// /mic 0
// /mic 1

const puppeteer = require("puppeteer-extra");
const childProcess = require("child_process");
const { promisify } = require("util");
const path = require("path");
const config = require("./config.json");
const exec = promisify(childProcess.exec);

const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

async function main() {
  let chromePath;
  const binPaths = ["google-chrome", "google-chrome-stable"];
  for (const binPath of binPaths) {
    try {
      chromePath = (await exec(`which ${binPath}`)).stdout.trim();
      console.log({ chromePath });
      break;
    } catch (err) {}
  }
  if (!chromePath) {
    throw new Error("chrome not found");
  }
  const userDataDir = path.join(__dirname, ".user-data");
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: chromePath,
    userDataDir,
    args: ["--no-sandbox"]
  });
  const context = browser.defaultBrowserContext();
  await context.overridePermissions("https://meet.google.com", [
    "camera",
    "microphone",
    "notifications"
  ]);

  const page = await browser.newPage();
  async function waitForClick(selector, puppeteerClick) {
    const element = await page.waitForSelector(selector);
    if (puppeteerClick) {
      await page.click(selector, { location: "topleft" });
    } else {
      await page.evaluate(element => {
        if (element.fireEvent) {
          element.fireEvent("on" + "click");
        } else {
          var evObj = document.createEvent("Events");
          evObj.initEvent("click", true, false);
          element.dispatchEvent(evObj);
        }
      }, element);
    }
  }

  await page.goto(`https://meet.google.com/${config.meeting}`);
  await waitForClick('[aria-label="Join meeting"]');
  await page.waitForSelector('[aria-label="Leave call"]');

  async function setLayout(layout) {
    await waitForClick('[aria-label="More options"]');
    await new Promise(res => setTimeout(res, 400));
    await waitForClick('[aria-label="Change layout"]', true);
    // await page.waitForSelector('[aria-label="Change layout"]', {
    //   visible: true
    // });
    // await page.keyboard.press("Enter");
    const layoutLabels = {
      auto: "Auto",
      sidebar: "Sidebar",
      spotlight: "Spotlight",
      tiled: "Tiled"
    };
    await waitForClick(`[aria-label="${layoutLabels[layout]}"]`);
  }

  async function onChatMessage(author, text) {
    console.log(`${author}: ${text}`);
    if (text.startsWith("/layout ")) {
      setLayout(text.split("/layout ")[1]);
    }
  }

  async function listenForChatMessage() {
    const ariaChat = await page.waitForSelector(
      '[aria-live="polite"]:not(:empty)'
    );
    const text = await page.evaluate(element => {
      const text = element.innerText;
      element.innerHTML = "";
      return text;
    }, ariaChat);

    const [author, message] = text
      .split(" says this in chat: ")
      .map(text => text.trim());
    if (author && message) {
      onChatMessage(author, message);
    }
    setImmediate(listenForChatMessage);
  }

  listenForChatMessage();
  await setLayout("spotlight");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
