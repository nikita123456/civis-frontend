import { Component, OnInit } from '@angular/core';

import {MatDialog,MatDialogRef} from '@angular/material/dialog';
@Component({
  selector: 'app-profane-word-pop-up',
  templateUrl: './profane-word-pop-up.component.html',
  styleUrls: ['./profane-word-pop-up.component.scss']
})
export class ProfaneWordPopUpComponent implements OnInit {

  constructor(public dialogRef: MatDialogRef<ProfaneWordPopUpComponent>) {}

  ngOnInit(): void {
  }

  closeDialog():void{
    this.dialogRef.close();
  }

}
