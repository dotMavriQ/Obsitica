import { ItemView, WorkspaceLeaf } from "obsidian";
import ObsiticaPlugin from "../main";

export const VIEW_TYPE_SIDEBAR = "obsitica-sidebar-view";

export class SidebarView extends ItemView {
  private plugin: ObsiticaPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: ObsiticaPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return VIEW_TYPE_SIDEBAR;
  }

  getDisplayText() {
    return "Obsitica";
  }

  getIcon() {
    return "calendar-with-checkmark"; // Use a suitable icon or custom icon
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();

    // Create tab container
    const tabContainer = container.createDiv("obsitica-tab-container");

    // Define tabs with emojis and views
    const tabs = [
      { emoji: "📆", view: "calendar" },
      { emoji: "📝", view: "notes" },
      { emoji: "💡", view: "ideas" },
      // Add more tabs as needed
    ];

    // Create tabs
    tabs.forEach((tab) => {
      const tabButton = tabContainer.createSpan("obsitica-tab");
      tabButton.setText(tab.emoji);
      tabButton.onClickEvent(() => {
        this.switchTab(tab.view);
      });
    });

    // Content area
    const contentArea = container.createDiv("obsitica-content-area");
    this.displayContent(contentArea, "calendar");
  }

  async onClose() {
    // Cleanup if necessary
  }

  private switchTab(view: string) {
    const contentArea = this.containerEl.querySelector(
      ".obsitica-content-area"
    ) as HTMLElement;
    contentArea.empty();
    this.displayContent(contentArea, view);
  }

  private displayContent(container: HTMLElement, view: string) {
    switch (view) {
      case "calendar":
        container.setText("Calendar View");
        break;
      case "notes":
        container.setText("Notes View");
        break;
      case "ideas":
        container.setText("Ideas View");
        break;
      default:
        container.setText("Default View");
    }
  }
}
