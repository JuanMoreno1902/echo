import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})

export class RegisterComponent {
  loginForm: FormGroup;
  showAlert = false;
  isDarkMode: boolean = false;
  
  constructor(private fb: FormBuilder, private router: Router, private supabaseService: SupabaseService){
    this.loginForm = this.fb.group({
      first_name: ['', [Validators.required]],
      last_name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password:['', [Validators.required]]
    });
  
    this.isDarkMode = localStorage.getItem('theme') === 'dark';
  }
    
  //Método para registrarse
  async onRegister() { 
    // Extrae los valores ingresados en el formulario
    const { first_name, last_name, email, password } = this.loginForm.value;
    const allowedDomains = ['hotmail.com', 'gmail.com', 'yahoo.com', 'outlook.com'];
    
    //Valida si el Email cumple con las condiciones de registro
    if (!email || !email.includes('@')) {
      this.showError();
      return;
    }
    
    //Obtiene el dominio del correo electrónico (parte después del '@')
    const emailDomain = email.split('@')[1]?.toLowerCase();
    
    //Verifica si el dominio del correo no está en la lista de permitidos
    if (!allowedDomains.includes(emailDomain)) {
      this.showError();
      return;
    }
    
    try {
      //Intenta registrar al usuario en Supabase con los datos ingresados
      const { user } = await this.supabaseService.signUp(email, first_name, last_name, password);
      console.log('Registro exitoso:', user);
      this.router.navigate(['/login']);
    
    } catch (error: any) {
      this.showError();
    }
  }
    
  //Método para alertas que se ocultan despues de 3 segundos
  showError(){
    this.showAlert = true;
    setTimeout(() => {
      this.showAlert = false;
    }, 3000);
  }
  
  //Método que intercambia los temas Brillante <---> Oscuro
  toggleTheme(){
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
  }
}
