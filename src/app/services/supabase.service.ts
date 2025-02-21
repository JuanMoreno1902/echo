import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    //Inicializa el cliente de Supabase con la URL y clave pública
    this.supabase = createClient(
      'https://ncpzvdnlcwaxiiiwfnmf.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jcHp2ZG5sY3dheGlpaXdmbm1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0ODExMDIsImV4cCI6MjA1NTA1NzEwMn0.4MA_JGw2SEmR-HdHN4D-bWtfMqYCOmGkcZYD7c8qBDk',
      {
        auth:{
          autoRefreshToken: false, // Evita la actualización automática del token
          persistSession: false,   // Desactiva el almacenamiento de sesión en localStorage
          detectSessionInUrl: false // Evita problemas con OAuth y la autenticación en la URL
        }
      }
    );
    console.log("Supabase inicializado:", this.supabase);
  }

  //Método para obtener todos los usuarios de la base de datos
  async getUsers() { 
    const { data, error } = await this.supabase.from('users').select('*');
    if (error) throw error; 
    return data; 
  }

  //Método para registrar un usuario
  async signUp(email: string, firstName: string, lastName: string, password: string) {
    try {
      // Validación de contraseña
      if (password.length < 6) {
        throw new Error("La contraseña debe tener al menos 6 caracteres");
      }

      //1.Registrar usuario
      const { data, error } = await this.supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password: password.trim(),
        options: {
          data: {
            first_name: firstName,
            last_name: lastName
          }
        }
      });

      if (error) throw error;
      console.log("Usuario registrado en Auth:", data.user?.id);

      //2.Insertar usuario en la tabla 'users'
      if (data.user) {
        const { error: insertError } = await this.supabase
          .from('users')
          .insert([{
            id: data.user.id,
            email: email.toLowerCase().trim(),
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            created_at: new Date().toISOString()
          }]);

        if (insertError) {
          //Revertir el registro en Auth si falla la inserción
          await this.supabase.auth.admin.deleteUser(data.user.id);
          throw new Error('Error al crearperfil: ${insertError.message}');
        }
        console.log("Usuario insertado en la tabla users");
      }

      return data;

    } catch (error) {
      console.error("Error completo en registro:", error);
      throw new Error(error instanceof Error ? error.message : "Error desconocido");
    }
  }


  //Método para Iniciar sesion de un usuario
  async signIn(email: string, password: string) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: password.trim()
      });

      if (error) {
        //Manejo detallado de errores
        if (error.message === "Invalid login credentials") {
          console.warn("Posibles causas:",
            "1. Usuario no verificado\n",
            "2. Credenciales incorrectas\n",
            "3. Usuario no existe");
        }
        throw error;
      }

      //Verificar si existe en public.users
      const { data: userData } = await this.supabase
        .from('users')
        .select()
        .eq('id', data.user.id)
        .single();

      if (!userData) {
        await this.supabase.auth.signOut();
        throw new Error("Perfil de usuario incompleto");
      }

      return data;

    } catch (error) {
      console.error("Error detallado en login:", error);
      throw new Error(error instanceof Error ? error.message : "Error de autenticación");
    }
  }

  //Método para obtener la sesión del usuario autenticado
  async getSession() {
    const { data, error } = await this.supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  //Método para encontrar un usuario por su correo electrónico
  async getUserByEmail(email: string) {
    try {
      //Normalizar el email (minúsculas y sin espacios)
      const normalizedEmail = email.toLowerCase().trim();
  
      //Buscar el usuario en la tabla 'users' por email
      const { data, error } = await this.supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .ilike('email', email.toLowerCase().trim())
        .single();

        //Evita errores si no se encuentra o hay múltiples coincidencias

      if (error) {
        console.error("Error en la búsqueda de usuario:", error);
        throw new Error("No se pudo buscar el usuario.");
      }
  
      if (!data) {
        console.warn("Usuario no encontrado con el email:", normalizedEmail);
        return null;
      }
  
      console.log("Usuario encontrado:", data);
      return data;
  
    } catch (error) {
      console.error("Error en findUserByEmail:", error);
      throw new Error(error instanceof Error ? error.message : "Error al buscar usuario");
    }
  }

  //Método para crear un chat entre dos usuarios en la base de datos
  async createChatBetweenUsers(user1: string, user2: string) {
    try {
      //Intenta insertar un nuevo registro en la tabla 'chats'
      const { data, error } = await this.supabase
        .from('chats') //Especifica la tabla donde se va a insertar el chat
        .insert([{
          user1: user1, //ID del primer usuario (debe ser un UUID)
          user2: user2, //ID del segundo usuario (también UUID)
          created_at: new Date().toISOString() //Registra la fecha y hora de creación en formato ISO
        }])
        .select() //Devuelve los datos insertados
        .single(); //Obtiene un solo resultado en lugar de un array

      //Verifica si ocurrió un error en la inserción
      if (error) {
        console.error('Error creando chat:', error); //Muestra el error en la consola
        return null; //Retorna null si hubo un error
      }

      console.log('Chat creado:', data); //Imprime en consola los datos del chat creado
      return data; //Retorna los datos del nuevo chat

    } catch (error) {
      console.error('Error en createChatBetweenUsers:', error); //Captura y muestra cualquier otro error inesperado
      return null; //Retorna null en caso de error
    }
  }

  //Método para obtener los chats del usuario autenticado
  async getChats(userId: string) {
    const { data, error } = await this.supabase
      .from('chats')
      .select('*')
      .or(`user1.eq.${userId}, user2.eq.${userId}`);
    return { data, error };
  }

  //Método para obtener usuario por ID
  async getUserById(userId: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', userId)
      .single(); 
    return { data, error };
  }

  //Método para obtener mensajes de un chat específico
  async getMessages(chatId: string) {
    const { data, error } = await this.supabase
      .from('messages')
      .select('id, chat_id, sender_id, content, image_url, create_at')  
      .eq('chat_id', chatId) 
      .order('create_at', { ascending: true });

    if (error) {
      console.error('Error obteniendo los mensajes:', error);
      return { data: [], error };  //Retorna un arreglo vacío si hay un error
    }

    return { data, error };
  }

  //Método de envios de mensajes
  async sendMessage(chatId: string, senderId: string, content: string, imageUrl?: string) {
    console.log("Enviando mensaje:", { chatId, senderId, content, imageUrl });
  
    if (!content?.trim() && !imageUrl) { 
      console.error("El mensaje no puede estar vacío");
      return; 
    }    

    const messageData: any = {
      chat_id: chatId,
      sender_id: senderId,
      content: content || null,
      image_url: imageUrl || null,
      create_at: new Date().toISOString(),
    };
  
    if (imageUrl) {
      messageData.image_url = imageUrl; 
    }
  
    const { data, error } = await this.supabase
      .from('messages') 
      .insert([messageData]);
  
    if (error) {
      console.error('Error enviando el mensaje:', error);
    } else {
      console.log('Mensaje enviado:', data);
    }
  }

  //Método para subir imagen a Supabase Storage (bucket público)
  async uploadImage(file: File) {
    const bucketName = 'chat-images';
    const filePath = `uploads/${Date.now()}_${file.name}`;

    const { data, error } = await this.supabase.storage
      .from(bucketName)
      .upload(filePath, file, { contentType: file.type });

    if (error) {
      console.error("Error al subir la imagen:", error);
      return null;
    }

    console.log("Imagen subida con éxito:", data);
    return { path: filePath }; 
  }

  //Método para obtener la URL pública de la imagen (para bucket público)
  getPublicUrl(filePath: string): string {
    const { data } = this.supabase.storage
      .from('chat-images') 
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  //Método para escuchar mensajes en tiempo real
  listenForNewMessages(chatId: string, userId: string, callback: (message: any) => void) {
    if (!userId) {
      console.error('El userId es inválido. No se puede filtrar mensajes correctamente.');
      return;
    }

    console.log(`Escuchando nuevos mensajes en chat: ${chatId}`);

    const channel = this.supabase
      .channel(`chat-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const newMessage = payload.new;

          if (newMessage['chat_id'] === chatId && newMessage['sender_id'] !== userId) {
            console.log('✅ Nuevo mensaje recibido en chat:', newMessage);
            callback(newMessage);
          }
        }
      )
      .subscribe();

    return channel;
  }

  //Método para logout
  async signOut() {
    await this.supabase.auth.signOut();
  }
}

