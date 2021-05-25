import { Component, OnInit, HostListener } from '@angular/core';
import { Apollo, QueryRef } from 'apollo-angular';
import { filter, map } from 'rxjs/operators';
import { GlossaryWord } from './glossary.graphql';
import { LinearLoaderService } from '../../shared/components/linear-loader/linear-loader.service';
import { ErrorService } from 'src/app/shared/components/error-modal/error.service';
import { UserService } from 'src/app/shared/services/user.service';
import { MatDialogRef} from '@angular/material/dialog';
import { ConsultationsService } from 'src/app/shared/services/consultations.service';

@Component({
  selector: 'app-glossary',
  templateUrl: './glossary.component.html',
  styleUrls: ['./glossary.component.scss']
})

export class GlossaryComponent implements OnInit {

  glossaryWordArray: Array<any>;
  glossaryWordQuery: QueryRef<any>;
  currentUser: any;
  consultationId: number;
  constructor(
    private apollo: Apollo, 
    private loader: LinearLoaderService, 
    private errorService: ErrorService,
    private userService: UserService,
    public dialogRef: MatDialogRef<GlossaryComponent>,
    private consultationService: ConsultationsService,
    ) {
      this.consultationService.consultationId$
      .pipe(
        filter(i=>i !== null)
      )
      .subscribe((consultationId:any) => {
        this.consultationId = consultationId;
      });
     }

  ngOnInit() {
    this.checkUserSignedIn();
    this.fetchCurrentGlossaryList();
  }

  checkUserSignedIn(){
    this.userService.userLoaded$
    .subscribe((exists: boolean) => {
      if (exists) {
        this.currentUser = this.userService.currentUser;
      }
    },
    err => {
      this.errorService.showErrorModal(err);
    });
  }

  fetchCurrentGlossaryList() {
    const variables = {
     id: String(this.consultationId),
    };
    console.log(variables);
    this.glossaryWordQuery = this.apollo.watchQuery({query: GlossaryWord, variables});
    this.glossaryWordQuery
      .valueChanges 
        .pipe (
          map((res: any) => res.data.glossaryWord)
        )
        .subscribe(item => {
            this.glossaryWordArray = item;
        }, err => {
            this.loader.hide();
            this.errorService.showErrorModal(err);
        });
  }
  closeDialog():void{
    this.dialogRef.close();
  }

}
