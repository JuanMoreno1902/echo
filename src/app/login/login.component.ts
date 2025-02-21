import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  showAlert = false;
  isDarkMode: boolean = false;
  
  constructor(private fb: FormBuilder, private router: Router, private supabaseService: SupabaseService){
    
    // Inicializar el formulario de inicio de sesión con los campos email y password
    this.loginForm = this.fb.group({
      email: ['', [Validators.required]],
      password:['', [Validators.required]]
    });

    //Carga el tema almacenado en localStorage (oscuro o claro)
    this.isDarkMode = localStorage.getItem('theme') === 'dark';
    console.log(this.supabaseService);
  }
  
  //Método para iniciar sesion 
  async onLogin(){
    const {email, password} = this.loginForm.value;
    try {
      //Intentar iniciar sesión con Supabase
      const user = await this.supabaseService.signIn(email, password);
      console.log("Inicio de sesión exitoso:", user);
      
      //Redirige al usuario a la página de inicio después de iniciar sesión
      this.router.navigate(['/init']);
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
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
