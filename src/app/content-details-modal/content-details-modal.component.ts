import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
  OnChanges,
  OnDestroy,
  Input,
  Renderer2,
  SimpleChanges,
  Inject,
  forwardRef
} from '@angular/core';
import { ToolService } from 'services/tool.service';
import { ContentItem, Session } from 'types/collection';
import { SelectItem } from 'primeng/api/selectitem';
import { AbstractGrid } from '../abstract-grid.class';
import { SessionsAvailable } from 'types/sessions-available';
import { Subscription} from 'rxjs';
import * as log from 'loglevel';
import * as utils from '../utils';
import { PDFDocumentProxy } from 'ng2-pdf-viewer';
import { DataService } from 'services/data.service';
import { ConfirmationService } from 'primeng/api';

(window as any).pdfWorkerSrc = '/resources/pdf.worker.min.js';

export enum KEY_CODE {
  RIGHT_ARROW = 39,
  LEFT_ARROW = 37
}

@Component({
  selector: 'app-content-details-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './content-details-modal.component.html',
  styleUrls: ['./content-details-modal.component.scss']
})

export class SessionDetailsModalComponent implements OnInit, OnChanges, OnDestroy {

  constructor(
    private toolService: ToolService,
    private changeDetectionRef: ChangeDetectorRef,
    private renderer: Renderer2,
    @Inject(forwardRef(() => AbstractGrid )) private parent: AbstractGrid,
    private dataService: DataService,
    private confirmationService: ConfirmationService
  ) {}

  @Input() serviceType: 'nw' | 'sa';
  @Input() collectionId: string;
  @Input() session: Session;
  @Input() content: ContentItem;
  @Input() sessionsAvailable: SessionsAvailable;

  utils = utils;
  sessionId: number;
  isOpen = false;
  private removeKeyupFunc?: () => void;
  iconClass = '';
  private subscriptions = new Subscription();

  // pdf / office - specific
  pdfFile: string;
  page = 1;
  selectedPage = 1;
  numPages: number;
  rotation = 0;
  pdfZoom = this.toolService.getNumberPreference('pdfZoomlevel', .5);
  zoomLevels: SelectItem[] = [
    {label: '25%', value: .25},
    {label: '50%', value: .5},
    {label: '75%', value: .75},
    {label: '100%', value: 1},
    {label: '125%', value: 1.25},
    {label: '150%', value: 1.5},
    {label: '175%', value: 1.75},
    {label: '200%', value: 2}
  ];


  onKeyEvent(event: KeyboardEvent): void {
    event.stopPropagation();
    log.debug('SessionDetailsModalComponent: keyEvent(): isOpen:', this.isOpen);
    if (event.keyCode === KEY_CODE.RIGHT_ARROW) {
      this.onNextSessionArrowClicked();
    }

    if (event.keyCode === KEY_CODE.LEFT_ARROW) {
      this.onPreviousSessionArrowClicked();
    }
  }


  ngOnInit(): void {
    log.debug('SessionDetailsModalComponent: ngOnInit()');

    this.subscriptions.add(
      this.toolService.displayContentDetailsModal.subscribe(
        (displayCollectionDetailsModal) => {
          if (displayCollectionDetailsModal) {
            this.onOpen();
          }
          else {
            this.onClosed();
          }
        }
      )
    );
  }



  ngOnDestroy() {
    if (this.removeKeyupFunc) {
      this.removeKeyupFunc();
    }
    this.subscriptions.unsubscribe();
  }



  ngOnChanges(values: SimpleChanges) {
    log.debug('SessionDetailsModalComponent: ngOnChanges(): values:', values);
    if ('session' in values && values.session.currentValue) {
      this.onNewSession();
    }
    if ('content' in values && values.content.currentValue) {
      this.onNewContent();
    }
  }



  onNewSession(): void {
    log.debug('SessionDetailsModalComponent: onNewSession: session:', this.session);
    // this.session = session;
    this.sessionId = this.session.id;
  }



  async onNewContent() {
    log.debug('SessionDetailsModalComponent: onNewContent: content:', this.content);
    this.page = 1;

    switch (this.content.contentType) {
      case 'encryptedRarEntry':
        this.iconClass = 'fa-lock';
        break;
      case 'encryptedRarTable':
        this.iconClass = 'fa-lock';
        break;
      case 'encryptedZipEntry':
        this.iconClass = 'fa-lock';
        break;
      case 'unsupportedZipEntry':
        this.iconClass = 'fa-lock';
        break;
      case 'image':
        this.iconClass = 'fa-file-image-o';
        break;
      case 'pdf':
        this.iconClass = 'fa-file-pdf-o';
        break;
      case 'office':
        switch (this.content.contentSubType) {
          case 'excel':
            this.iconClass = 'fa-file-excel-o';
            break;
          case 'word':
            this.iconClass = 'fa-file-word-o';
            break;
          case 'powerpoint':
            this.iconClass = 'fa-file-powerpoint-o';
            break;
        }
        break;
    }

    if (['pdf', 'office'].includes(this.content.contentType)) {
      const pdfFile = this.content.proxyContentFile
        ? this.content.proxyContentFile
        : this.content.contentFile;
      this.pdfFile = '/collections/' + this.collectionId + '/' + utils.uriEncodeFilename(pdfFile);
    }
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onOpen(): void {
    log.debug('SessionDetailsModalComponent: onOpen()');
    this.isOpen = true;
    this.removeKeyupFunc = this.renderer.listen('window', 'keyup', (event) => this.onKeyEvent(event));
    this.changeDetectionRef.detectChanges();
  }



  onCloseClicked(): void {
    log.debug('SessionDetailsModalComponent: onCloseClicked()');
    this.toolService.displayContentDetailsModal.next(false);
  }



  onClosed(): void {
    log.debug('SessionDetailsModalComponent: onClosed()');
    this.isOpen = false;
    if (this.removeKeyupFunc) {
      this.removeKeyupFunc();
      this.removeKeyupFunc = undefined;
    }
  }



  onNextSessionArrowClicked(): void {
    if (!this.sessionsAvailable.next) {
      return;
    }
    log.debug('SessionDetailsModalComponent: onNextSessionArrowClicked()');
    this.parent.onNextSessionClicked();
  }



  onPreviousSessionArrowClicked(): void {
    if (!this.sessionsAvailable.previous) {
      return;
    }
    log.debug('SessionDetailsModalComponent: onPreviousSessionArrowClicked()');
    this.parent.onPreviousSessionClicked();
  }



  onZoomLevelClicked() {
    log.debug('SessionDetailsModalComponent: onZoomLevelClicked()');
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onZoomLevelChange(): void {
    log.debug('PdfViewerModalComponent: onZoomLevelChange()');
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
    this.toolService.setPreference('pdfZoomlevel', this.pdfZoom);
  }



  absorbPdfInfo(p: PDFDocumentProxy): void {
    // log.debug('absorbPdfInfo', p);
    this.numPages = p.numPages;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  rotate(): void {
    if (this.rotation === 0) {
      this.rotation = 90;
    }
    else if (this.rotation === 90) {
      this.rotation = 180;
    }
    else if (this.rotation === 180) {
      this.rotation = 270;
    }
    else if (this.rotation === 270) {
      this.rotation = 0;
    }
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onPdfViewerError(error: any): void {
    if (error?.message === 'Worker was destroyed') {
      return;
    }
    log.error('PdfViewerModalComponent: onPdfViewerError(): pdf viewer threw error:', error);
  }



  async downloadLinkClicked(event: Event, item: ContentItem, downloadArchive = false): Promise<void> {
    const file = downloadArchive
      ? item.archiveFilename
      : item.contentFile;
    const url = `/collections/${this.collectionId}/${file}`;
    const filename = `session_${this.sessionId}_${file}`;

    this.confirmationService.confirm({
      target: event.target ?? undefined,
      message: 'This file contains potentially harmful data.  Are you sure you want to download it?',
      accept: () => this.dataService.downloadFile(url, filename),
      key: 'content-details-modal'
    });
    this.changeDetectionRef.detectChanges();
  }

}
