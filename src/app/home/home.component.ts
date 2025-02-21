import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  isDarkMode: boolean = false;

  constructor(private router: Router){
  

    this.isDarkMode = localStorage.getItem('theme') === 'dark';
  }

  //Metodo para para cambiar el fondo brillante <---> oscuro
  toggleTheme(){
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
  }

}
