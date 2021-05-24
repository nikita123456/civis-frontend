import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedComponentsModule } from 'src/app/shared/components/shared-components.module';
import { Routes, RouterModule, Router } from '@angular/router';
import { ProfaneWordPopUpComponent } from './profane-word-pop-up.component';
import { PipesModule } from 'src/app/shared/pipes/pipes.module';

const routes: Routes = [
  {
    path: 'content-policy',
    component: ProfaneWordPopUpComponent
  }
];

@NgModule({
  declarations: [ProfaneWordPopUpComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    SharedComponentsModule,
    PipesModule
  ],
  exports: [
    Router
  ]
})

export class ProfaneWordPopUpModule { }
