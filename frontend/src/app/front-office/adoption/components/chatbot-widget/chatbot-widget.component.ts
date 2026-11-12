import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../auth/auth.service';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  loading?: boolean;
}

@Component({
  selector: 'app-chatbot-widget',
  templateUrl: './chatbot-widget.component.html',
  styleUrls: ['./chatbot-widget.component.css']
})
export class ChatbotWidgetComponent implements OnInit, AfterViewChecked {

  @ViewChild('messagesEnd') messagesEnd!: ElementRef;

  isOpen = false;
  messages: Message[] = [];
  userInput = '';
  isLoading = false;
  currentUser: any = null;

  userRequests: any[] = [];
  userAppointments: any[] = [];
  dataLoaded = false;

  private readonly API_BASE    = 'http://localhost:8087/elif/api/adoption';
  private readonly CHATBOT_URL = 'http://localhost:8087/elif/api/ai/chatbot/message';

  private conversationHistory: { role: string; content: string }[] = [];

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen && this.messages.length === 0) {
      this.initChat();
    }
  }

  closeChat(): void {
    this.isOpen = false;
  }

  async initChat(): Promise<void> {
    if (this.currentUser?.role === 'USER') {
      await this.loadUserData();
    }
    const name = this.currentUser?.firstName || '';
    const welcomeMsg = this.currentUser
      ? `Hello **${name}** 👋 I'm your adoption assistant!\n\nI can help you with:\n• 📋 Status of your adoption requests\n• 📅 Your scheduled appointments\n• 🐾 Finding the right pet for you\n• ❓ Any questions about adoption\n\nWhat can I do for you?`
      : `Hello! 👋 I'm your adoption assistant!\n\nI can help you with:\n• 🐾 Finding the perfect pet\n• ❓ How the adoption process works\n• 🏠 Shelter information\n• 📋 Adoption requirements\n\nLog in to also check your request status!`;
    this.addAssistantMessage(welcomeMsg);
  }

  async loadUserData(): Promise<void> {
    if (this.dataLoaded || !this.currentUser?.id) return;
    try {
      const [requests, appointments] = await Promise.all([
        this.http.get<any[]>(`${this.API_BASE}/requests/adopter/${this.currentUser.id}`).toPromise(),
        this.http.get<any[]>(`${this.API_BASE}/appointments/adopter/${this.currentUser.id}`).toPromise()
      ]);
      this.userRequests     = requests     || [];
      this.userAppointments = appointments || [];
      this.dataLoaded = true;
    } catch (err) {
      console.error('Error loading user data for chatbot', err);
    }
  }

  async sendMessage(): Promise<void> {
    const input = this.userInput.trim();
    if (!input || this.isLoading) return;

    this.userInput = '';
    this.addUserMessage(input);
    this.isLoading = true;

    const loadingMsg: Message = { role: 'assistant', content: '', timestamp: new Date(), loading: true };
    this.messages.push(loadingMsg);

    try {
      if (this.currentUser?.role === 'USER' && !this.dataLoaded) {
        await this.loadUserData();
      }

      const reply = await this.callBackend(input);

      const idx = this.messages.indexOf(loadingMsg);
      if (idx !== -1) {
        this.messages[idx] = { role: 'assistant', content: reply, timestamp: new Date() };
      }

      this.conversationHistory.push({ role: 'user',      content: input });
      this.conversationHistory.push({ role: 'assistant', content: reply });

      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }

    } catch (err) {
      console.error('Chatbot error:', err);
      const idx = this.messages.indexOf(loadingMsg);
      if (idx !== -1) {
        this.messages[idx] = { role: 'assistant', content: '❌ Sorry, I encountered an error. Please try again.', timestamp: new Date() };
      }
    }

    this.isLoading = false;
  }

  private callBackend(userMessage: string): Promise<string> {
    const body = {
      systemPrompt: this.buildSystemPrompt(),
      history:      this.conversationHistory,
      message:      userMessage
    };
    return this.http
      .post<{ reply: string }>(this.CHATBOT_URL, body)
      .toPromise()
      .then(res => res?.reply || 'No response received.');
  }

  private buildSystemPrompt(): string {
    let prompt = `You are a friendly and helpful adoption assistant for an animal adoption platform called "PURRE PETS".
You help users with adoption-related questions, explain the process, and provide real-time info about their requests and appointments.
Always be warm, empathetic, and encouraging about pet adoption.
Keep responses concise and use emojis naturally.
IMPORTANT: Always respond in English only, regardless of the language the user writes in.
PLATFORM INFO:
- Users browse available pets and submit adoption requests
- Shelters review requests and may schedule on-site visits
- After the visit, the shelter approves or rejects the adoption
- A contract is generated upon approval

REQUEST STATUS MEANINGS:
- PENDING: Submitted, waiting for shelter review
- UNDER_REVIEW: Shelter is actively reviewing the request
- APPROVED: Adoption approved! Contract has been generated
- REJECTED: Request not accepted (reason provided)
- CANCELLED: Cancelled by the adopter`;

    if (this.currentUser) {
      prompt += `\n\nCURRENT USER:\n- Name: ${this.currentUser.firstName} ${this.currentUser.lastName}\n- Email: ${this.currentUser.email}\n- Role: ${this.currentUser.role}`;

      if (this.currentUser.role === 'USER') {
        if (this.userRequests.length > 0) {
          prompt += `\n\nUSER'S ADOPTION REQUESTS (${this.userRequests.length} total):`;
          this.userRequests.forEach((req, i) => {
            prompt += `\n${i + 1}. Pet: "${req.petName}" | Status: ${req.status} | Submitted: ${new Date(req.dateRequested).toLocaleDateString()}`;
            if (req.rejectionReason)    prompt += ` | Rejection reason: ${req.rejectionReason}`;
            if (req.approvedDate)       prompt += ` | Approved on: ${new Date(req.approvedDate).toLocaleDateString()}`;
            if (req.compatibilityScore) prompt += ` | Compatibility: ${req.compatibilityScore}/100`;
          });
        } else {
          prompt += `\n\nUSER'S ADOPTION REQUESTS: None yet.`;
        }

        if (this.userAppointments.length > 0) {
          prompt += `\n\nUSER'S APPOINTMENTS (${this.userAppointments.length} total):`;
          this.userAppointments.forEach((appt, i) => {
            const d = new Date(appt.appointmentDate);
            prompt += `\n${i + 1}. Pet: "${appt.pet?.name}" | Date: ${d.toLocaleDateString()} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} | Status: ${appt.status}`;
            if (appt.shelterNotes)       prompt += ` | Notes: ${appt.shelterNotes}`;
            if (appt.consultationResult) prompt += ` | Result: ${appt.consultationResult}`;
            if (appt.responseMessage)    prompt += ` | Message: ${appt.responseMessage}`;
          });
        } else {
          prompt += `\n\nUSER'S APPOINTMENTS: None scheduled.`;
        }
      }
    } else {
      prompt += `\n\nCURRENT USER: Not logged in. Encourage them to create an account to track adoption requests.`;
    }

    return prompt;
  }

  get quickSuggestions(): string[] {
    if (!this.currentUser) {
      return ['🐾 How does adoption work?', '📋 What are the requirements?', '🏠 Tell me about shelters'];
    }
    if (this.currentUser.role === 'USER') {
      return ['📋 My request status', '📅 My appointments', '🐾 Find me a pet'];
    }
    return ['❓ How can I help adopters?'];
  }

  sendQuickMessage(msg: string): void {
    this.userInput = msg;
    this.sendMessage();
  }

  private addUserMessage(content: string): void {
    this.messages.push({ role: 'user', content, timestamp: new Date() });
  }

  private addAssistantMessage(content: string): void {
    this.messages.push({ role: 'assistant', content, timestamp: new Date() });
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesEnd) {
        this.messagesEnd.nativeElement.scrollIntoView({ behavior: 'smooth' });
      }
    } catch {}
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  formatMessage(content: string): string {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }
}