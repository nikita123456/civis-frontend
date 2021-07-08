import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit, AfterViewChecked } from '@angular/core';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { UserService } from 'src/app/shared/services/user.service';
import { ConsultationsService } from 'src/app/shared/services/consultations.service';
import { isObjectEmpty, checkPropertiesPresence, scrollToFirstError } from '../../../../shared/functions/modular.functions';
import { atLeastOneCheckboxCheckedValidator } from 'src/app/shared/validators/checkbox-validator';
import { Apollo } from 'apollo-angular';
import { SubmitResponseQuery, ConsultationProfileCurrentUser, CreateUserCountRecord,UpdateUserCountRecord, UserCountUser } from '../consultation-profile.graphql';
import { filter, map } from 'rxjs/operators';
import { ErrorService } from 'src/app/shared/components/error-modal/error.service';


@Component({
  selector: 'app-consultation-questionnaire',
  templateUrl: './consultation-questionnaire.component.html',
  styleUrls: ['./consultation-questionnaire.component.scss']
})
export class ConsultationQuestionnaireComponent implements OnInit, AfterViewInit, AfterViewChecked {

  @Input() profileData;
  @Output() openThankYouModal: EventEmitter<any> = new EventEmitter();
  @ViewChild('questionnaireContainer', { read: ElementRef , static: false }) questionnaireContainer: ElementRef<any>;

  responseFeedback: string;
  questionnaireForm: FormGroup;
  currentUser: any;
  responseAnswers: any[];
  showError: boolean;
  responseVisibility: any;
  longTextAnswer: any;
  templateText: any;
  templateId: any;
  responseSubmitLoading: boolean;
  consultationId: any;
  showConfirmEmailModal: boolean;
  questions: any;
  scrollToError: boolean;
  activeRoundNumber: any;
  respondedRounds = [];
  responseCreated: boolean;
  authModal = false;
  isConfirmModal = false;
  confirmMessage = {
    msg: 'Do you want to reconsider your response? We detected some potentially harmful language, and to keep Civis safe and open we recommend revising responses that were detected as potentially harmful.',
    title: ''
  };
  nudgeMessageDisplayed= false;
  userResponse='';
  profanityCount: any;
  userData:any;
  profanity_count_changed: boolean=false;
  isUserResponseProfane: boolean=false;
  isApproved = 0;

  constructor(private _fb: FormBuilder,
    private userService: UserService,
    private consultationService: ConsultationsService,
    private apollo: Apollo,
    private errorService: ErrorService,
    private el: ElementRef) {
    this.questionnaireForm = this._fb.group({});
    this.consultationService.consultationId$
    .pipe(
      filter(i => i !== null)
    )
    .subscribe((consulationId: any) => {
      this.consultationId = consulationId;
    });
  }

  ngOnInit(): void {
    this.getCurrentUser();
    this.subscribeProfileData();
    this.validateAnswers();
  }

  ngAfterViewInit() {
    this.subscribeUseTheResponseAnswer();
  }

  ngAfterViewChecked() {
    if (this.scrollToError) {
      scrollToFirstError('.error-msg', this.el.nativeElement);
      this.scrollToError = false;
    }
  }

  setSatisfactoryRating(value) {
    this.responseFeedback = value;
  }

  getCurrentUser() {
    this.userService.userLoaded$
    .subscribe((data) => {
      if (data) {
        this.currentUser = this.userService.currentUser;
      } else {
        this.currentUser = null;
      }
    });
  }

  subscribeProfileData() {
    this.consultationService.consultationProfileData.subscribe((data) => {
      this.profileData = data;
      this.activeRoundNumber = this.getActiveRound(this.profileData.responseRounds);
      this.respondedRounds = this.getRespondedRounds();
      if (this.respondedRounds.includes(this.activeRoundNumber)) {
        this.responseCreated = true;
        return;
      } else {
        if (this.profileData && this.profileData.respondedOn) {
          this.consultationService.submitResponseActiveRoundEnabled.next(true);
        }
      }
      this.questionnaireForm = this.makeQuestionnaireModal();
    });
  }

  getRespondedRounds() {
    const respondedRounds = [];
    if (this.profileData) {
      const anonymousResponses = this.profileData.anonymousResponses && this.profileData.anonymousResponses.edges;
      const sharedResponses = this.profileData.sharedResponses  && this.profileData.sharedResponses.edges;
      if (anonymousResponses && anonymousResponses.length) {
        anonymousResponses.map((response: any) => {
          if (response && response.node && response.node.user) {
            respondedRounds.push(response.node.roundNumber);
          }
        });
      }
      if (sharedResponses && sharedResponses.length) {
        sharedResponses.map((response: any) => {
          if (response && response.node && response.node.user) {
            if (this.currentUser && (this.currentUser.id === response.node.user.id)) {
              respondedRounds.push(response.node.roundNumber);
            }
          }
        });
      }
    }
    return respondedRounds;
  }

  makeQuestionnaireModal(roundNumber?) {
    const responseRounds = this.profileData.responseRounds;
    if (responseRounds && responseRounds.length) {
      const activeRound  = responseRounds.find((round) => round.active);
      if (!isObjectEmpty(activeRound)) {
         this.questions = activeRound.questions;
          if (this.questions.length) {
            const form = new FormGroup({});
            this.questions.forEach(question => {
              if (question.questionType !== 'checkbox') {
                question.isOptional ? form.addControl(question.id, new FormControl(null)) :
                form.addControl(question.id, new FormControl(null, Validators.required ));
              } else if (question.questionType === 'checkbox') {
                form.addControl(question.id, this.makeCheckboxQuestionOptions(question));
              }
              if (question.is_other) {
                question.isOptional ? form.addControl('other_answer-' + question.id, new FormControl(null)) :
                  form.addControl('other_answer-' + question.id, new FormControl(null, Validators.required));
              }
            });
            return form;
          }
      }
    }
  }

  makeCheckboxQuestionOptions(question) {
    let form: any;
    form = question.isOptional ? new FormGroup({}) : new FormGroup({}, {
      validators: atLeastOneCheckboxCheckedValidator()
    });
    question.subQuestions.forEach(subQuestion => {
      form.addControl(subQuestion.id, new FormControl(false));
    });
    return form;
  }

  toggleCheckbox(questionId, subQuestionId) {
    const control = this.questionnaireForm.get([questionId, subQuestionId]);
    control.patchValue(!control.value);
  }

  validCurrentUser() {
    if (this.currentUser && !this.currentUser.confirmedAt) {
      this.showConfirmEmailModal = true;
      return false;
    }
    return true;
  }

  submitAnswer() {
    if (this.responseSubmitLoading) {
      return;
    }
    if (this.questionnaireForm.valid && this.responseFeedback) {
      this.responseAnswers = this.getResponseAnswers();
      const consultationResponse = this.getConsultationResponse();
      if (!isObjectEmpty(consultationResponse)) {
        if (this.currentUser) {
          this.apollo.watchQuery({
            query: UserCountUser,
            variables: {userId:this.currentUser.id},
            fetchPolicy:'no-cache'
          })
          .valueChanges
          .pipe (
            map((res: any) => res.data.userCountUser)
          )
          .subscribe(data => {
            if(!this.profanity_count_changed){
              this.userData=data;
              this.updateProfanityCount();
            }
          }, err => {
            const e = new Error(err);
              this.errorService.showErrorModal(err);
          });
        } else {
          this.authModal = true;
          // localStorage.setItem(
          //   'consultationResponse',
          //   JSON.stringify(consultationResponse)
          // ); //TODO
        }
      }
    } else {
      if (!this.responseFeedback) {
        this.consultationService.satisfactionRatingError.next(true);
      }
      this.showError = true;
      this.scrollToError = true;
    }
  }

  updateProfanityCount(){
    var Filter = require('bad-words'),
    filter = new Filter();
    filter.addWords('4r5e','5h1t','5hit','a55','anal','anus','ar5e','arrse','arse','ass','ass-fucker','asses','assfucker','assfukka','asshole','assholes','asswhole','a_s_s','b!tch','b00bs','b17ch','b1tch','ballbag','balls','ballsack','bastard','beastial','beastiality','bellend','bestial','bestiality','bi+ch','biatch','bitch','bitcher','bitchers','bitches','bitchin','bitching','bloody','blow job','blowjob','blowjobs','boiolas','bollock','bollok','boner','boob','boobs','booobs','boooobs','booooobs','booooooobs','breasts','buceta','bugger','bum','bunny fucker','butt','butthole','buttmunch','buttplug','c0ck','c0cksucker','carpet muncher','cawk','chink','cipa','cl1t','clit','clitoris','clits','cnut','cock','cock-sucker','cockface','cockhead','cockmunch','cockmuncher','cocks','cocksuck','cocksucked','cocksucker','cocksucking','cocksucks','cocksuka','cocksukka','cok','cokmuncher','coksucka','coon','cox','crap','cum','cummer','cumming','cums','cumshot','cunilingus','cunillingus','cunnilingus','cunt','cuntlick','cuntlicker','cuntlicking','cunts','cyalis','cyberfuc','cyberfuck','cyberfucked','cyberfucker','cyberfuckers','cyberfucking','d1ck','damn','dick','dickhead','dildo','dildos','dink','dinks','dirsa','dlck','dog-fucker','doggin','dogging','donkeyribber','doosh','duche','dyke','ejaculate','ejaculated','ejaculates','ejaculating','ejaculatings','ejaculation','ejakulate','f u c k','f u c k e r','f4nny','fag','fagging','faggitt','faggot','faggs','fagot','fagots','fags','fanny','fannyflaps','fannyfucker','fanyy','fatass','fcuk','fcuker','fcuking','feck','fecker','felching','fellate','fellatio','fingerfuck','fingerfucked','fingerfucker','fingerfuckers','fingerfucking','fingerfucks','fistfuck','fistfucked','fistfucker','fistfuckers','fistfucking','fistfuckings','fistfucks','flange','fook','fooker','fuck','fucka','fucked','fucker','fuckers','fuckhead','fuckheads','fuckin','fucking','fuckings','fuckingshitmotherfucker','fuckme','fucks','fuckwhit','fuckwit','fudge packer','fudgepacker','fuk','fuker','fukker','fukkin','fuks','fukwhit','fukwit','fux','fux0r','f_u_c_k','gangbang','gangbanged','gangbangs','gaylord','gaysex','goatse','God','god-dam','god-damned','goddamn','goddamned','hardcoresex','hell','heshe','hoar','hoare','hoer','homo','hore','horniest','horny','hotsex','jack-off','jackoff','jap','jerk-off','jism','jiz','jizm','jizz','kawk','knob','knobead','knobed','knobend','knobhead','knobjocky','knobjokey','kock','kondum','kondums','kum','kummer','kumming','kums','kunilingus','l3i+ch','l3itch','labia','lmfao','lust','lusting','m0f0','m0fo','m45terbate','ma5terb8','ma5terbate','masochist','master-bate','masterb8','masterbat*','masterbat3','masterbate','masterbation','masterbations','masturbate','mo-fo','mof0','mofo','mothafuck','mothafucka','mothafuckas','mothafuckaz','mothafucked','mothafucker','mothafuckers','mothafuckin','mothafucking','mothafuckings','mothafucks','mother fucker','motherfuck','motherfucked','motherfucker','motherfuckers','motherfuckin','motherfucking','motherfuckings','motherfuckka','motherfucks','muff','mutha','muthafecker','muthafuckker','muther','mutherfucker','n1gga','n1gger','nazi','nigg3r','nigg4h','nigga','niggah','niggas','niggaz','nigger','niggers','nob','nob jokey','nobhead','nobjocky','nobjokey','numbnuts','nutsack','orgasim','orgasims','orgasm','orgasms','p0rn','pawn','pecker','penis','penisfucker','phonesex','phuck','phuk','phuked','phuking','phukked','phukking','phuks','phuq','pigfucker','pimpis','piss','pissed','pisser','pissers','pisses','pissflaps','pissin','pissing','pissoff','poop','porn','porno','pornography','pornos','prick','pricks','pron','pube','pusse','pussi','pussies','pussy','pussys','rectum','retard','rimjaw','rimming','s hit','s.o.b.','sadist','schlong','screwing','scroat','scrote','scrotum','semen','sex','sh!+','sh!t','sh1t','shag','shagger','shaggin','shagging','shemale','shi+','shit','shitdick','shite','shited','shitey','shitfuck','shitfull','shithead','shiting','shitings','shits','shitted','shitter','shitters','shitting','shittings','shitty','skank','slut','sluts','smegma','smut','snatch','son-of-a-bitch','spac','spunk','s_h_i_t','t1tt1e5','t1tties','teets','teez','testical','testicle','tit','titfuck','tits','titt','tittie5','tittiefucker','titties','tittyfuck','tittywank','titwank','tosser','turd','tw4t','twat','twathead','twatty','twunt','twunter','v14gra','v1gra','vagina','viagra','vulva','w00se','wang','wank','wanker','wanky','whoar','whore','willies','willy','xrated','xxx','baap ke lavde','chodu','chodoo','choodu','gandu','gaandu','gandoo','bhosad','bhosada','bhosadaa','bhosadaaa','bhosadii','bhosadika','bhosadike','bhosadiki','bosadike','bakrichod','balatkaar','behen ke laude','betichod','bhai chhod','bhayee chod','bhen chhod','bhaynchod','behanchod','behenchod','bhen ke lode','bhosdi','bhosdike','chipkai ki choot ke paseene','cha cha chod','chod ke bal ka kida','chopre he randi','chudasi','chut ka maindak','chutia','chutiya','chootia','chutiye','dheeli choot','choot','chootiya','gaand chaat mera','gaand','gaand ka khadda','gaand ke dhakan','gaand mein kida','gandi chut mein sadta hua ganda kida','gandmasti','jhaat ke baal','jhat lahergaya','jhatoo','jhantu','kukarchod','kutha sala','kuthta buraanahe kandaa nahi pattaahe','lode jesi shakal ke','lode ke baal','lund khajoor','lund chuse','lund','luhnd','lundh','madar chod','maadarchod','maadar','madar','chod','madarchod','madarchod ke aulaad','mader chod','mai chod','mera mume le','mere fudi kha ley','meri ghand ka baal','randi','randi ka choda','suzit','sust lund ki padaish','tatti ander lele','tere baap ki gaand','teri chute mai chuglee','teri gaand mein haathi ka lund','teri maa ki choot','teri maa ki sukhi bhos','teri phuphi ki choot mein','teri bhosri mein aag','teri gaand me danda','teri ma ki choot me bara sa land','teri ma ki chudaye bandar se hui','teri ma randi','teri maa ke bable','teri maa ke bhosade ke baal','tu tera maa ka lauda','amma ki chut','bhaand me jaao','bhadva','bhadve','chodika','bhadwe ki nasal','bhen ke lode maa chuda','bhosad chod','bhosadchod','bhosadi ke','bhosdee kay','bhosdi k','bulle ke baal','bursungha','camina','chod bhangra','choot k bhoot','choot k pakode','choot ka paani','choot ka pissu','choot ki jhilli','chudpagal','chut ke makkhan','chootiye','gaand maar bhen chod','gand mein louda','gandi fuddi ki gandi auladd','haram zaadaa','harami','jhaat','kaala lund','kaali kutti','kuthri','kutte','kutte ki olad','lavde ka baal','lavde','lodu','lowde ka bal','lund k laddu','lund mera muh tera','maa-cho','maal chhodna','mahder chod','mera gota moo may lay','mome ka pasina chat','moo may lay mera','padosi ki aulaad','rand ki moot','randi baj','randi ka larka','randi ke bacche','randi ke beej','saale lm','sab ka lund teri ma ki chut mein','sinak se paida hua','suvar chod','suwar ki aulad','tera gittha','tere maa ka bur','teri behen ka bhosda faadu','teri gand mai ghadhe ka lund','teri ma bahar chud rahi he','teri ma ko kutta chode','teri maa ka bhosra','teri maa ka boba chusu','teri maa ki choot me kutte ka lavda','teri maa ki chut','teri maa ki chute','tuzya aaichi kanda puchi','bhadavya','bhikaar','bulli','chinaal','chut','gand','maadarbhagat','chodubhagat','lundfakir','gandit','jhavadya','laudu','lavadya','muttha','raandichya','madarchoth');
    filter.addWords('baap ke lavde','chodu','chodoo','choodu','gandu','gaandu','gandoo','bhosad','bhosada','bhosadaa','bhosadaaa','bhosadii','bhosadika','bhosadike','bhosadiki','bosadike','bakrichod','balatkaar','behen ke laude','betichod','bhai chhod','bhayee chod','bhen chhod','bhaynchod','behanchod','behenchod','bhen ke lode','bhosdi','bhosdike','chipkai ki choot ke paseene','cha cha chod','chod ke bal ka kida','chopre he randi','chudasi','chut ka maindak','chutia','chutiya','chootia','chutiye','dheeli choot','choot','chootiya','gaand chaat mera','gaand','gaand ka khadda','gaand ke dhakan','gaand mein kida','gandi chut mein sadta hua ganda kida','gandmasti','jhaat ke baal','jhat lahergaya','jhatoo','jhantu','kukarchod','kutha sala','kuthta buraanahe kandaa nahi pattaahe','lode jesi shakal ke','lode ke baal','lund khajoor','lund chuse','lund','luhnd','lundh','madar chod','maadarchod','maadar','madar','chod','madarchod','madarchod ke aulaad','mader chod','mai chod','mera mume le','mere fudi kha ley','meri ghand ka baal','randi','randi ka choda','suzit','sust lund ki padaish','tatti ander lele','tere baap ki gaand','teri chute mai chuglee','teri gaand mein haathi ka lund','teri maa ki choot','teri maa ki sukhi bhos','teri phuphi ki choot mein','teri bhosri mein aag','teri gaand me danda','teri ma ki choot me bara sa land','teri ma ki chudaye bandar se hui','teri ma randi','teri maa ke bable','teri maa ke bhosade ke baal','tu tera maa ka lauda','amma ki chut','bhaand me jaao','bhadva','bhadve','chodika','bhadwe ki nasal','bhen ke lode maa chuda','bhosad chod','bhosadchod','bhosadi ke','bhosdee kay','bhosdi k','bulle ke baal','bursungha','camina','chod bhangra','choot k bhoot','choot k pakode','choot ka paani','choot ka pissu','choot ki jhilli','chudpagal','chut ke makkhan','chootiye','gaand maar bhen chod','gand mein louda','gandi fuddi ki gandi auladd','haram zaadaa','harami','jhaat','kaala lund','kaali kutti','kuthri','kutte','kutte ki olad','lavde ka baal','lavde','lodu','lowde ka bal','lund k laddu','lund mera muh tera','maa-cho','maal chhodna','mahder chod','mera gota moo may lay','mome ka pasina chat','moo may lay mera','padosi ki aulaad','rand ki moot','randi baj','randi ka larka','randi ke bacche','randi ke beej','saale lm','sab ka lund teri ma ki chut mein','sinak se paida hua','suvar chod','suwar ki aulad','tera gittha','tere maa ka bur','teri behen ka bhosda faadu','teri gand mai ghadhe ka lund','teri ma bahar chud rahi he','teri ma ko kutta chode','teri maa ka bhosra','teri maa ka boba chusu','teri maa ki choot me kutte ka lavda','teri maa ki chut','teri maa ki chute','tuzya aaichi kanda puchi','bhadavya','bhikaar','bulli','chinaal','chut','gand','maadarbhagat','chodubhagat','lundfakir','gandit','jhavadya','laudu','lavadya','muttha','raandichya','madarchoth');

    this.isUserResponseProfane=filter.isProfane(this.userResponse);
    
    if (this.userData!==null){
      this.profanityCount=this.userData.profanityCount;
    }
    else{
      this.profanityCount=0;
      if(this.isUserResponseProfane){
        if (!this.nudgeMessageDisplayed) {
          this.isConfirmModal = true;
          this.nudgeMessageDisplayed=true;
          return;
        }
        this.profanityCount+=1;
        this.isApproved=+1;
      }
      this.apollo.mutate({
        mutation: CreateUserCountRecord,
        variables:{
          userCount:{
            userId: this.currentUser.id,
            profanityCount: this.profanityCount,
            shortResponseCount: 0
          }
         },
       })
      .subscribe((data) => {
        this.invokeSubmitResponse();
      }, err => {
        this.errorService.showErrorModal(err);
      });
      this.profanity_count_changed=true;
    return;
    }

    if(this.isUserResponseProfane){
      if (!this.nudgeMessageDisplayed) {
        this.isConfirmModal = true;
        this.nudgeMessageDisplayed=true;
        return;
      }
      this.profanityCount+=1;
      this.isApproved=+1;
      if(this.profanityCount>=3){
        this.confirmMessage.msg = 'We detected that your response may contain harmful language. This response will be moderated and sent to the Government at our moderator\'s discretion.'
        this.isConfirmModal = true;
      }
    }
    else{
      this.invokeSubmitResponse();
      return;
    }
    
    this.apollo.mutate({
      mutation: UpdateUserCountRecord,
        variables:{
          userCount:{
          userId: this.currentUser.id,
          profanityCount:this.profanityCount,
          shortResponseCount: this.userData.shortResponseCount
        }
      },
    })
    .subscribe((data) => {   
      this.invokeSubmitResponse();
    }, err => {
      this.errorService.showErrorModal(err);
    });
    this.profanity_count_changed=true;
  }

  confirmed(event) {
    this.isConfirmModal = false;
  }

  invokeSubmitResponse(){
    const consultationResponse = this.getConsultationResponse();
    this.submitResponse(consultationResponse);
    this.showError = false;
  }

  getResponseAnswers () {
    const answers = {...this.questionnaireForm.value};
    const responseAnswers = [];
    for (const item in answers) {
      if (answers.hasOwnProperty(item) && answers[item] !== null) {
        if (typeof(answers[item]) === 'object') {
            const keys = Object.keys(answers[item]);
            const filtered = keys.filter(function(key) {
                return answers[item][key];
            });
            answers[item] = filtered;
            let otherElement = false;
            for (let i = 0 ; i < answers[item].length; i++) {
              if (answers[item][i] === 'other') {
                otherElement = true;
                break;
              }
            }
            if (otherElement) {
              const filteredAnswers = answers[item].filter(val => {
                return val !== 'other';
              });
              if (filteredAnswers.length > 0) {
                responseAnswers.push({
                  question_id: item,
                  is_other: true,
                  other_option_answer: answers['other_answer-' + item],
                  answer: filteredAnswers
                });
              } else {
                responseAnswers.push({
                  question_id: item,
                  is_other: true,
                  other_option_answer: answers['other_answer-' + item]
                });
              }
            } else {
              if (answers[item].length > 0) {
                responseAnswers.push({
                  question_id: item,
                  answer: answers[item]
                });
              }
            }
        }
        if (answers[item] === 'other') {
          responseAnswers.push({
            question_id: item,
            is_other: true,
            other_option_answer: answers['other_answer-' + item],
          });
        } else if (!(item.includes('other')) && !Array.isArray(answers[item])) {
          if (answers[item].length > 0 || typeof answers[item] !== 'string') {
            responseAnswers.push({
              question_id: item,
              answer: answers[item]
            });
          }
        }
      }
    }
    return responseAnswers;
  }

  validateAnswers() {
    this.consultationService.validateAnswers.subscribe((value) => {
      if (value) {
        this.submitAnswer();
        this.consultationService.validateAnswers.next(false);
      }
    });
  }

  getConsultationResponse() {
    const consultationResponse =  {
      consultationId: this.profileData.id,
      satisfactionRating : this.responseFeedback,
      visibility: this.responseVisibility ? 'shared' : 'anonymous',
      isApproved: this.isApproved,
    };
    if (checkPropertiesPresence(consultationResponse)) {
      consultationResponse['templateId'] = this.templateId;
      consultationResponse['answers'] = this.responseAnswers;
      return consultationResponse;
    }
    return;
  }

  onAnswerChange(question?, value?, checkboxValue?) {
    if (question && value.id === 'other') {
      let otherValue = true;
      if (question.questionType === 'checkbox' && value.id === 'other' && !checkboxValue) {
         otherValue = false;
      }
      for (let i = 0; i < this.questions.length; i++) {
        if (this.questions[i].id === question.id) {
          this.questions[i].is_other = otherValue;
          if (question.isOptional) {
            this.questionnaireForm.addControl('other_answer-' + question.id, new FormControl(null));
          } else {
            this.questionnaireForm.addControl('other_answer-' + question.id, new FormControl(null, Validators.required));
          }
          break;
        }
      }
    } else {
      if (question.questionType !== 'checkbox') {
        this.questions.forEach(ques => {
          if (question.id === ques.id) {
            ques.is_other = false;
          }
        });
      }
    }
  }

  subscribeUseTheResponseAnswer() {
    this.consultationService.useThisResponseAnswer.subscribe((obj: any) => {
      if (obj && !isObjectEmpty(obj)) {
        const {templateId, longTextResponses} = obj;
        this.templateId = templateId;
        longTextResponses.map((response) => {
          const controlName = response.id.toString();
          this.longTextAnswer = this.templateText = response.answer;
            const textAreaElement = document.getElementById(`text-area-${controlName}`);
            if (textAreaElement) {
              window.scrollTo({
                top: this.questionnaireContainer.nativeElement.offsetTop - 80,
                behavior: 'smooth',
              });
              this.questionnaireForm.get(controlName).patchValue(this.longTextAnswer);
            }
        });

      }
    });
  }

  submitResponse(consultationResponse) {
    this.responseSubmitLoading = true;
    this.apollo.mutate({
      mutation: SubmitResponseQuery,
      variables: {
        consultationResponse: consultationResponse
      },
      update: (store, {data: res}) => {
        const variables = {id: this.consultationId};
        const resp: any = store.readQuery({query: ConsultationProfileCurrentUser, variables});
        if (res) {
          resp.consultationProfile.respondedOn = res.consultationResponseCreate.consultation.respondedOn;
          resp.consultationProfile.sharedResponses = res.consultationResponseCreate.consultation.sharedResponses;
          resp.consultationProfile.responseSubmissionMessage = res.consultationResponseCreate.consultation.responseSubmissionMessage;
          resp.consultationProfile.satisfactionRatingDistribution =
            res.consultationResponseCreate.consultation.satisfactionRatingDistribution;
        }
        store.writeQuery({query: ConsultationProfileCurrentUser, variables, data: resp});
      }
    })
    .pipe (
      map((res: any) => res.data.consultationResponseCreate)
    )
    .subscribe((res) => {
      this.openThankYouModal.emit(res.points);
      this.responseSubmitLoading = false;
      this.responseCreated = true;
      this.consultationService.submitResponseActiveRoundEnabled.next(false);
    }, err => {
      this.responseSubmitLoading = false;
      this.errorService.showErrorModal(err);
    });
  }

  showPublicResponseOption() {
    if (this.profileData && this.profileData.enforcePrivateResponse) {
      return false;
    }
    if (this.longTextAnswer && this.templateText) {
      return this.longTextAnswer !== this.templateText;
    }
    return true;
  }

  getActiveRound(responseRounds) {
    if (responseRounds && responseRounds.length) {
      const activeRound  = responseRounds.find((round) => round.active);
      if (!isObjectEmpty(activeRound)) {
        return activeRound.roundNumber;
      }
    }
  return;
  }


}
