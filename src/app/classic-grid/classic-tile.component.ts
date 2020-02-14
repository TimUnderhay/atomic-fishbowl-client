import { Component, ChangeDetectionStrategy, ChangeDetectorRef, Input, OnInit, OnChanges, ViewChild, ElementRef, NgZone, SimpleChanges } from '@angular/core';
import { ToolService } from 'services/tool.service';
import { Content } from 'types/content';
import { trigger, state, style, transition, animate, useAnimation } from '@angular/animations';
import { zoomIn, zoomOut } from 'ng-animate';
import { DataService } from 'services/data.service';
import * as utils from '../utils';
import * as log from 'loglevel';

@Component({
  selector: 'classic-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<!-- [@zoom]="animationState" -->
<!-- @zoom -->
<!-- (@zoom.done)="onAnimationComplete($event)" -->
<div class="thumbnail-container" [@zoom]="animationState">

  <img #image class="thumbnail" [src]="imgSource" [hidden]="showHighRes && highResLoaded" (load)="onLowResLoaded()" (error)="onLowResError()" [ngClass]="loadedContentClass" draggable="false" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile">

  <img #highResImage *ngIf="showHighRes || loadHighRes" [hidden]="!showHighRes || !highResLoaded" [src]="highResImgSource" (load)="onHighResLoaded()" (error)="onHighResError()" class="thumbnail" [ngClass]="loadedContentClass" draggable="false" [attr.sessionId]="content.session" [attr.contentType]="content.contentType" [attr.contentFile]="content.contentFile">

</div>
`,
  animations: [
    trigger('zoom', [
      state('initial', style({ visibility: 'hidden' })),
      // state('start', style({ visibility: 'visible' })),
      state('zoomIn', style({ visibility: 'visible' }) ),
      state('zoomOut', style({ display: 'none' }) ),
      // transition('* => zoomIn', animate(0) ),
      // transition('initial => start', animate(0) ),
      transition('initial => zoomIn', [style({ visibility: 'visible' }), useAnimation(zoomIn, { params: { timing: 1 } } )]),
      transition('zoomOut => zoomIn', [style({ display: 'block' }), useAnimation(zoomIn, { params: { timing: 1 } } )]),
      transition('* => zoomOut', useAnimation(zoomOut, { params: { timing: 1 } } ) ),
      // transition(':enter', useAnimation(zoomIn, { params: { timing: .75 } } )),
      // transition(':leave', useAnimation(zoomOut, { params: { timing: 1 } } ) )
    ])
  ]
})

export class ClassicTileComponent implements OnInit, OnChanges {

  constructor(private changeDetectionRef: ChangeDetectorRef,
              public dataService: DataService,
              private toolService: ToolService,
              private zone: NgZone,
              private el: ElementRef ) {}

  public utils = utils;

  @ViewChild('image', { static: true }) imageRef: ElementRef;
  @ViewChild('highResImage', { static: false }) highResImageRef: ElementRef;

  @Input() content: Content;
  @Input() collectionId: string = null;
  @Input() loadHighRes = false; // this triggers initial loading of the high-res image (not the displaying of it - bound from the parent's loadAllHighResImages
  @Input() showHighRes = false; // this triggers the displaying of high-res images
  @Input() hide = false;
  public imgSource = '';
  public highResImgSource = '';
  public contentClass = '';
  public loadedContentClass: string; // this will hold the value of contentClass after the low-res image has loaded.  This will allow the border to only load afterwards
  public animationState = 'initial'; // initial, zoomIn, zoomOut
  public highResLoaded = false;  // tracks whether the high-res image has finished loading



  ngOnInit(): void {
    let endFunc: Function;

    switch (this.content.contentType) {
      case 'image':
        this.imgSource = `/collections/${this.collectionId}/${utils.uriEncodeFilename(this.content.thumbnail)}`;
        this.highResImgSource = `/collections/${this.collectionId}/${utils.uriEncodeFilename(this.content.contentFile)}`;
        break;
      case 'pdf':
        this.imgSource = `/collections/${this.collectionId}/${utils.uriEncodeFilename(this.content.thumbnail)}`;
        this.highResImgSource = `/collections/${this.collectionId}/${utils.uriEncodeFilename(this.content.pdfImage)}`;
        this.contentClass = 'pdf';
        break;
      case 'office':
        this.imgSource = `/collections/${this.collectionId}/${utils.uriEncodeFilename(this.content.thumbnail)}`;
        this.highResImgSource = `/collections/${this.collectionId}/${utils.uriEncodeFilename(this.content.pdfImage)}`;
        this.contentClass = this.content.contentSubType;
        endFunc = () => {
          this.imageRef.nativeElement.setAttribute('contentSubType', this.content.contentSubType);
          this.imageRef.nativeElement.setAttribute('proxyContentFile', this.content.proxyContentFile);
        };
        break;
      case 'encryptedZipEntry':
        this.imgSource = `/resources/zip_icon_locked.png`;
        this.highResImgSource = `/resources/zip_icon_locked.png`;
        break;
      case 'unsupportedZipEntry':
        this.imgSource = `/resources/zip_icon_unknown.png`;
        this.highResImgSource = `/resources/zip_icon_unknown.png`;
        break;
      case 'encryptedRarEntry':
        this.imgSource = `/resources/rar_icon_locked.png`;
        this.highResImgSource = `/resources/rar_icon_locked.png`;
        break;
      case 'encryptedRarTable':
        this.imgSource = `/resources/rar_icon_locked.png`;
        this.highResImgSource = `/resources/rar_icon_locked.png`;
        this.contentClass = '';
        break;
      case 'hash':
        this.imgSource = `/resources/${this.content.hashType}_hash_icon.png`;
        this.highResImgSource = `/resources/${this.content.hashType}_hash_icon.png`;
        break;
    }
    this.zone.runOutsideAngular( () => setTimeout( () => {
      if (endFunc) {
        endFunc();
      }
    }, 0) );
    // this.zone.runOutsideAngular( () => this.imageRef.nativeElement.onload(this.onLowResLoaded) );
    // this.zone.runOutsideAngular( () => this.highResImageRef.nativeElement.addEventListener('onload', this.onHighResLoaded() ) );
    // this.animationState = 'zoomIn';
  }



  ngOnChanges(values: SimpleChanges): void {
    // log.debug('ClassicTileComponent: onChanges():', values);
    let isFirstChanges = true;
    Object.keys(values).forEach( key => {
      if (!values[key].firstChange) {
        isFirstChanges = false;
      }
    });
    // if ('showHighRes' in values && values.showHighRes.)
    if (isFirstChanges) {
      return;
    }
    if ('hide' in values && values.hide.currentValue === true) {
      this.el.nativeElement.classList.add('hidden');
      // this.animationState = 'zoomOut';
    }
    if ('hide' in values && values.hide.currentValue === false) {
      this.el.nativeElement.classList.remove('hidden');
      // this.animationState = 'zoomIn';
    }
    /*if ('showHighRes' in values && values.showHighRes.currentValue !== values.showHighRes.previousValue) {
      log.debug('ClassicTileComponent: onChanges(): showHighRes changing.  New value:', values.showHighRes.currentValue);
    }*/
    // this.changeDetectionRef.reattach();
    // this.zone.runOutsideAngular( () => setTimeout( () => this.changeDetectionRef.detach(), 0) );
  }



  onLowResError() {
    // show an error image here
    log.debug('ClassicTileComponent: onLowResError()');
    this.imgSource = '/resources/error_icon.png';
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onLowResLoaded() {
    // log.debug('ClassicTileComponent: onLowResLoaded():');
    // this.changeDetectionRef.reattach();
    // this.animationState = 'start';
    // this.changeDetectionRef.markForCheck();
    // this.changeDetectionRef.detectChanges();
    this.animationState = 'zoomIn';
    this.loadedContentClass = this.contentClass;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
    // this.zone.runOutsideAngular( () => setTimeout( () => this.changeDetectionRef.detach(), 0) );
  }



  onHighResLoaded() {
    // log.debug('ClassicTileComponent: onHighResLoaded():');
    this.highResLoaded = true;
    // this.changeDetectionRef.reattach();
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
    // this.zone.runOutsideAngular( () => setTimeout( () => this.changeDetectionRef.detach(), 0) );
  }



  onHighResError() {
    // show an error image here
    log.debug('ClassicTileComponent: onHighResError(): content id:', this.content.id);
    log.debug('ClassicTileComponent: onHighResError(): highResImgSource:', this.highResImgSource);
    this.highResImgSource = '/resources/error_icon.png';
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onAnimationComplete(event) {
    log.debug('ClassicTileComponent: onAnimationComplete():');
    if (this.animationState === 'zoomOut') {
      this.el.nativeElement.classList.add('hidden');
    }
  }


}

