import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-confirmation-modal',
  templateUrl: './confirmation-modal.component.html',
  styleUrls: ['./confirmation-modal.component.scss']
})
export class ConfirmationModalComponent implements OnInit {
  @Input() message = {
    title: null,
    msg: null
  };
  @Output() close = new EventEmitter<boolean>();
  @Input() showCancel = false;

  constructor() { 
    
  }

  ngOnInit() {
    console.log(this.showCancel);
  }

  selectOpt(opt: string) {
    opt === 'ok' ? this.close.emit(true) : this.close.emit(false);
  }

}
