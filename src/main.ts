import { App, Plugin, Notice } from 'obsidian';
import { HabiticaService } from './habitica/habiticaService';
import { SidebarView, VIEW_TYPE_SIDEBAR } from './views/sidebarView';
import { ObsiticaSettingTab, DEFAULT_SETTINGS, ObsiticaSettings } from './settings';


export default class ObsiticaPlugin extends Plugin {
    public habiticaService: HabiticaService = new HabiticaService(this);
    public settings!: ObsiticaSettings;

  async onload() {
    console.log('Loading Obsitica Plugin');

    // Load settings
    await this.loadSettings();

    // Initialize Habitica Service
    this.habiticaService = new HabiticaService(this);

    // Add settings tab
    this.addSettingTab(new ObsiticaSettingTab(this.app, this));

    // Register the sidebar view
    this.registerView(VIEW_TYPE_SIDEBAR, (leaf) => new SidebarView(leaf, this));

    // Activate the sidebar view
    this.app.workspace.onLayoutReady(() => {
      this.activateSidebar();
    });

    // Insert Habitica data into the daily journal
    this.app.workspace.onLayoutReady(async () => {
      await this.insertHabiticaDataIntoJournal();
    });
  }

  onunload() {
    console.log('Unloading Obsitica Plugin');
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_SIDEBAR);
  }

  async activateSidebar() {
    if (this.app.workspace.getLeavesOfType(VIEW_TYPE_SIDEBAR).length === 0) {
      const rightLeaf = this.app.workspace.getRightLeaf(false);
      if (rightLeaf) {
        await rightLeaf.setViewState({
          type: VIEW_TYPE_SIDEBAR,
        });
      } else {
        console.error('Failed to get the right leaf.');
      }
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async insertHabiticaDataIntoJournal() {
    try {
      const data = await this.habiticaService.getUserData();
      await this.appendHabiticaDataToJournal(data);
    } catch (error) {
      new Notice('Failed to insert Habitica data. Check console for details.');
      console.error('Error inserting Habitica data:', error);
    }
  }

  async appendHabiticaDataToJournal(data: any) {
    const dailyNotePath = this.getDailyNotePath();
    const dailyNote = this.app.vault.getAbstractFileByPath(dailyNotePath);

    if (dailyNote instanceof TFile) {
      const content = `\n## Habitica Data\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n`;
      await this.app.vault.append(dailyNote, content);
      new Notice('Habitica data appended to your daily journal.');
    } else {
      new Notice('Daily journal not found.');
    }
  }

  getDailyNotePath(): string {
    const dateStr = window.moment().format('YYYY-MM-DD');
    return `Journal/${dateStr}.md`; // Adjust the path based on your setup
  }
}
