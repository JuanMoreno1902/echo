import { Component, OnInit, OnDestroy } from '@angular/core';
import { SupabaseService } from '../services/supabase.service'; 

@Component({
  selector: 'app-chat',
  templateUrl: './init.component.html', 
  styleUrls: ['./init.component.css'] 
})
export class InitComponent implements OnInit, OnDestroy {

  isDarkMode: boolean = false;
  chats: any[] = []; 
  messages: any[] = []; 
  selectedChat: any = null; 
  userId: string | null = null; 
  newMessage: string = ''; 
  private chatSubscription: any;

  constructor(private supabaseService: SupabaseService) {}

  //Método que se ejecuta cuando el componente se inicializa
  async ngOnInit(): Promise<void> { 
    this.isDarkMode = localStorage.getItem('theme') === 'dark'; // Recupera la preferencia de tema del almacenamiento local
    
    try {
      const session = await this.supabaseService.getSession(); //Obtiene la sesión del usuario desde Supabase
      this.userId = session?.user?.id || null; //Asigna el ID del usuario si está autenticado
      
      console.log("ID del usuario autenticado:", this.userId); 
  
      if (this.userId) { 
        await this.loadChats();
      } else {
        console.warn("⚠ No se pudo obtener el userId"); 
      }
    } catch (error) {
      console.error('Error obteniendo la sesión:', error); 
    }
  }
  
  // Método para cargar los chats del usuario
  async loadChats(): Promise<void> {
    if (!this.userId) return;
  
    try {
      const { data: chats, error } = await this.supabaseService.getChats(this.userId);
      if (error) throw error;
  
      if (chats) {
        this.chats = await Promise.all(
          chats.map(async (chat) => {
            const otherUserId = chat.user1 === this.userId ? chat.user2 : chat.user1;
            const { data: userData, error: userError } = await this.supabaseService.getUserById(otherUserId);
  
            return {
              ...chat,
              otherUserName: userData ? `${userData.first_name} ${userData.last_name}` : 'Usuario desconocido',
            };
          })
        );
  
        console.log('Chats cargados:', this.chats);
      }
    } catch (error) {
      console.error('Error obteniendo los chats:', error);
    }
  }
  
  //Método para agregar un nuevo chat
  async addChat(): Promise<void> {
    const user2Email = prompt('Ingrese el correo del usuario con quien quiere chatear:');

    if (!user2Email || !user2Email.trim()) {
        alert('Por favor, ingrese un correo válido.');
        return;
    }
    if (!this.userId) {
        alert('No hay una sesión activa. Por favor, inicie sesión nuevamente.');
        return;
    }
    try {
        console.log('Buscando usuario con email:', user2Email);
        
        //Buscar el usuario en la base de datos con el correo proporcionado
        const user2 = await this.supabaseService.getUserByEmail(user2Email.trim());

        if (!user2) {
            console.log('No se encontró al usuario.');
            alert('No se encontró ningún usuario con ese correo electrónico.');
            return;
        }

        if (user2.id === this.userId) {
            alert('No puedes crear un chat contigo mismo.');
            return;
        }

        //Crear un nuevo chat entre el usuario actual y el usuario encontrado
        const chat = await this.supabaseService.createChatBetweenUsers(this.userId, user2.id);

        if (chat) {
            console.log('Chat creado:', chat);
            alert(`Chat creado exitosamente con ${user2.first_name || user2.email}`);

            //Actualizar la lista de chats después de crear uno nuevo
            await this.loadChats();
        } else {
            alert('Hubo un error al crear el chat. Por favor, intente nuevamente.');
        }
    } catch (error) {
        console.error('Error al crear el chat:', error);
        alert('Ocurrió un error al crear el chat. Por favor, intente nuevamente.');
    }
  }

  //Método para seleccionar un chat y cargar sus mensajes
  async selectChat(chat: any): Promise<void> {
    this.selectedChat = chat;
    this.messages = []; //Limpiar mensajes anteriores
    
    try {
      const { data, error } = await this.supabaseService.getMessages(chat.id);
      if (error) throw error;
      this.messages = data || [];
  
      //Cancelar la suscripción anterior antes de crear una nueva
      if (this.chatSubscription) {
        console.log('Cancelando suscripción anterior...');
        this.chatSubscription.unsubscribe();
      }
      if (!this.userId) {
        console.error('El userId es null. No se puede suscribir a los mensajes.');
        return;
      }
      
      console.log('Suscribiéndose a nuevos mensajes en chat:', chat.id);
      
      this.chatSubscription = this.supabaseService.listenForNewMessages(chat.id, this.userId, (message) => { 
        if (message.sender_id !== this.userId) { //Filtra mensajes enviados por el usuario actual
          this.messages.push(message);
          console.log('Mensaje agregado a la vista:', message);
        }
      });
      
      
  
    } catch (error) {
      console.error('Error obteniendo los mensajes:', error);
    }
  }
  

  selectedImageFile: File | null = null;
  imagePreview: string | null = null; //Para previsualizar la imagen

  //Método para capturar la imagen seleccionada
  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedImageFile = file;
      
      //Crear una previsualización de la imagen
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result; //Asignar la imagen previsualizada
      };
      reader.readAsDataURL(file);

      console.log('Imagen seleccionada:', file);
    }
  }

  //Método para remover la imagen seleccionada
  removeImage(): void {
    this.selectedImageFile = null;
    this.imagePreview = null;
  }

  //Método para enviar mensaje con texto o imagen
  //Enviar mensaje con imagen (si existe)
  async sendMessage(): Promise<void> {
    if (!this.selectedChat || !this.userId) {
      console.error('No hay un chat seleccionado o el usuario no está identificado.');
      return;
    }

    const chatId = this.selectedChat.id;
    const senderId = this.userId;
    const content = this.newMessage.trim();

    if (!content && !this.selectedImageFile) {
      console.error('El mensaje debe contener texto o una imagen.');
      return;
    }

    let imageUrl: string | undefined;

    //Subir imagen si se ha seleccionado una
    if (this.selectedImageFile) {
      try {
        const uploadResult = await this.supabaseService.uploadImage(this.selectedImageFile);
        if (!uploadResult?.path) throw new Error("Error al obtener la ruta de la imagen.");

        //Obtener la URL pública
        imageUrl = this.supabaseService.getPublicUrl(uploadResult.path);

        //Verificar si la URL pública es correcta
        console.log("URL de la imagen obtenida:", imageUrl);

      } catch (error) {
        console.error('Error subiendo la imagen:', error);
        return;
      }
    }

    //Agregar mensaje localmente para mostrarlo de inmediato
    const tempMessage = { chatId, senderId, content, imageUrl, timestamp: new Date().toISOString() };
    this.messages.push(tempMessage);

    //Limpiar el campo de mensaje e imagen
    this.newMessage = '';
    this.selectedImageFile = null;
    this.imagePreview = null;

    try {
      await this.supabaseService.sendMessage(chatId, senderId, content, imageUrl);
    } catch (error) {
      console.error('Error enviando el mensaje:', error);
      this.messages = this.messages.filter(msg => msg !== tempMessage); //Remover el mensaje si falla
    }
  }

  //Método que se ejecuta cuando el componente es destruido
  ngOnDestroy(): void {
    if (this.chatSubscription) this.chatSubscription.unsubscribe(); //Limpia la suscripción a los mensajes en tiempo real
  }

  //Método para cambiar el tema entre oscuro y claro
  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode; //Cambia el estado del tema
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light'); //Guarda la preferencia en el almacenamiento local
  }

  //Método para cerrar sesión
  async signOut(): Promise<void> {
    try {
      await this.supabaseService.signOut(); // Cierra la sesión del usuario
      this.userId = null; //Resetea el ID del usuario
      this.chats = []; //Limpia los chats y mensajes
      this.messages = [];
      this.selectedChat = null; //Desmarca el chat seleccionado
      console.log('Sesión cerrada con éxito.');
    } catch (error) {
      console.error('Error al cerrar sesión:', error); //Captura el error si no se puede cerrar la sesión
    }
  }
}
