import {
  App,
  Plugin,
  Notice,
  TFile,
  MarkdownView,
  WorkspaceLeaf,
} from "obsidian";
import { HabiticaService } from "./habitica/habiticaService";
import { SidebarView, VIEW_TYPE_SIDEBAR } from "./views/sidebarView";
import {
  ObsiticaSettingTab,
  DEFAULT_SETTINGS,
  ObsiticaSettings,
} from "./settings";

export default class ObsiticaPlugin extends Plugin {
  public habiticaService!: HabiticaService;
  public settings!: ObsiticaSettings;

  async onload() {
    console.log("Loading Obsitica Plugin");

    // Load settings
    await this.loadSettings();

    // Initialize Habitica Service
    this.habiticaService = new HabiticaService(this);

    // Add settings tab
    this.addSettingTab(new ObsiticaSettingTab(this.app, this));

    // Register the sidebar view
    this.registerView(
      VIEW_TYPE_SIDEBAR,
      (leaf: WorkspaceLeaf) => new SidebarView(leaf, this)
    );

    // Activate the sidebar view
    this.app.workspace.onLayoutReady(() => {
      this.activateSidebar();
    });

    // Register the command
    this.addCommand({
      id: "generate-habits-and-dailies",
      name: "Generate Habits & Dailies",
      callback: () => this.generateHabitsAndDailies(),
      hotkeys: [
        {
          modifiers: ["Mod", "Shift"],
          key: "H",
        },
      ],
    });
  }

  onunload() {
    console.log("Unloading Obsitica Plugin");
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_SIDEBAR);
  }

  async activateSidebar() {
    if (this.app.workspace.getLeavesOfType(VIEW_TYPE_SIDEBAR).length === 0) {
      const rightLeaf = this.app.workspace.getRightLeaf(true);
      if (rightLeaf) {
        await rightLeaf.setViewState({
          type: VIEW_TYPE_SIDEBAR,
        });
      } else {
        console.error("Failed to get or create the right leaf.");
      }
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async generateHabitsAndDailies() {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView) {
      new Notice("Please open a Markdown file to insert Habitica data.");
      return;
    }

    const file = activeView.file;
    if (!file) {
      new Notice("No file is open. Please open a Markdown file.");
      return;
    }

    const journalFolderName = this.settings.journalFolderName || "Journal";
    if (
      !file.path.toLowerCase().startsWith(`${journalFolderName.toLowerCase()}/`)
    ) {
      new Notice(
        `This command can only be used in the ${journalFolderName} folder.`
      );
      return;
    }

    const fileNamePattern = /^\d{4}-\d{2}-\d{2}\.md$/;
    if (!fileNamePattern.test(file.name)) {
      new Notice("This command can only be used in daily journal notes.");
      return;
    }

    const { habiticaUserId, habiticaApiToken } = this.settings;
    if (!habiticaUserId || !habiticaApiToken) {
      new Notice(
        "Please enter your Habitica credentials in the Obsitica settings."
      );
      return;
    }

    await this.insertHabitsAndDailies(activeView);
  }

  async insertHabitsAndDailies(activeView: MarkdownView) {
    try {
      const tasks = await this.habiticaService.getTasks();

      const habitsOutput = tasks
        .filter(
          (task) =>
            task.type === "habit" &&
            (task.counterUp > 0 || task.counterDown > 0)
        )
        .map(
          (task) =>
            `* Habit clicked: ${task.text} - Positive: ${task.counterUp}, Negative: ${task.counterDown}`
        )
        .join("\n");

      const dailiesOutput = tasks
        .filter((task) => task.type === "daily" && task.completed)
        .map((task) => `* ${task.text}`)
        .join("\n");

      const today = window.moment().format("YYYY-MM-DD");
      const output = `## Achievements on ${today}\n${habitsOutput}\n\n## Completed Dailies\n${dailiesOutput}`;

      const editor = activeView.editor;
      editor.replaceRange(output, editor.getCursor());

      new Notice("Habits and Dailies inserted successfully.");
    } catch (error) {
      new Notice("Failed to fetch Habitica tasks. Check console for details.");
      console.error("Error fetching Habitica tasks:", error);
    }
  }

  async updateStepsFrontmatter(file: TFile, newSteps: string) {
    const content = await this.app.vault.read(file);
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const match = content.match(frontmatterRegex);
    let newContent;

    if (match) {
      const frontmatterText = match[1];
      const updatedFrontmatter = frontmatterText
        .split("\n")
        .map((line) =>
          line.startsWith("steps:") ? `steps: ${newSteps}` : line
        )
        .join("\n");

      newContent = content.replace(
        frontmatterRegex,
        `---\n${updatedFrontmatter}\n---`
      );
    } else {
      newContent = `---\nsteps: ${newSteps}\n---\n\n${content}`;
    }

    await this.app.vault.modify(file, newContent);
  }
}
