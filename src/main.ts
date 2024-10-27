import {
    App,
    Plugin,
    Notice,
    TFile,
    MarkdownView,
    PluginManifest,
  } from 'obsidian';
  import { HabiticaService } from './habitica/habiticaService';
  import { SidebarView, VIEW_TYPE_SIDEBAR } from './views/sidebarView';
  import {
    ObsiticaSettingTab,
    DEFAULT_SETTINGS,
    ObsiticaSettings,
  } from './settings';
  
  export default class ObsiticaPlugin extends Plugin {
    public habiticaService!: HabiticaService;
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
  
      // Register the command
      this.addCommand({
        id: 'generate-habits-and-dailies',
        name: 'Generate Habits & Dailies',
        callback: () => this.generateHabitsAndDailies(),
        hotkeys: [
          {
            modifiers: ['Mod', 'Shift'],
            key: 'H',
          },
        ],
      });
    }
  
    onunload() {
      console.log('Unloading Obsitica Plugin');
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
          console.error('Failed to get or create the right leaf.');
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
      const dailyNote = this.app.vault.getAbstractFileByPath(
        dailyNotePath
      ) as TFile | null;
  
      if (dailyNote instanceof TFile) {
        const content = `\n## Habitica Data\n\n\`\`\`json\n${JSON.stringify(
          data,
          null,
          2
        )}\n\`\`\`\n`;
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
  
    async generateHabitsAndDailies() {
      // Get the active view
      const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (!activeView) {
        new Notice('Please open a Markdown file to insert Habitica data.');
        return;
      }
  
      const file = activeView.file;
      if (!file) {
        new Notice('No file is open. Please open a Markdown file.');
        return;
      }
  
      const filePath = file.path;
      const fileName = file.name;
  
      // Check if the file is in the 'Journal' folder
      if (!filePath.startsWith('Journal/')) {
        new Notice('Obsitica: This command can only be used in the Journal folder.');
        return;
      }
  
      // Check if the file name matches 'YYYY-MM-DD.md' format
      const fileNamePattern = /^\d{4}-\d{2}-\d{2}\.md$/;
      if (!fileNamePattern.test(fileName)) {
        new Notice('Obsitica: This command can only be used in daily journal notes.');
        return;
      }
  
      // Check if Habitica credentials are set
      const { habiticaUserId, habiticaApiToken } = this.settings;
      if (!habiticaUserId || !habiticaApiToken) {
        new Notice(
          'Obsitica: Please enter your Habitica credentials in the Obsitica settings.'
        );
        return;
      }
  
      // Proceed to fetch and insert data
      await this.insertHabitsAndDailies(activeView);
    }
  
    async insertHabitsAndDailies(activeView: MarkdownView) {
      try {
        const tasks = await this.habiticaService.getTasks();
  
        // Process habits
        const habits = tasks.filter(
          (task) =>
            task.type === 'habit' && (task.counterUp > 0 || task.counterDown > 0)
        );
  
        const habitsOutput = habits.map((task) => {
          return `* Habit clicked: ${task.text} - Positive: ${task.counterUp}, Negative: ${task.counterDown}`;
        });
  
        // Process dailies
        const dailies = tasks.filter(
          (task) => task.type === 'daily' && task.completed
        );
  
        const dailiesOutput = dailies.map((task) => {
          return `* ${task.text}`;
        });
  
        // Get today's date
        const today = window.moment().format('YYYY-MM-DD');
  
        // Construct the output
        const output = [
          `## Achievements on ${today}`,
          ...habitsOutput,
          '',
          '## Completed Dailies',
          ...dailiesOutput,
        ].join('\n');
  
        // Insert the output into the document
        const editor = activeView.editor;
        const cursor = editor.getCursor();
        editor.replaceRange(output, cursor);
  
        new Notice('Habits and Dailies inserted successfully.');
      } catch (error) {
        new Notice('Failed to fetch Habitica tasks. Check console for details.');
        console.error('Error fetching Habitica tasks:', error);
      }
    }
  }
  