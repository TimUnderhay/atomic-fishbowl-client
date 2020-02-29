import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, Input, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { PanZoomAPI } from 'ng2-panzoom';
import * as log from 'loglevel';

@Component({
  selector: 'control-bar-classic',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="noselect">

  <router-dropdown (isOpen)="onRouterDropdownOpen($event)"></router-dropdown>

  <span *ngIf="!routerDropdownOpen" toggleFullscreen class="icon fa fa-desktop fa-2x fa-fw"></span>

  <span *ngIf="!routerDropdownOpen" (click)="zoomToFit()" class="icon fa fa-home fa-2x fa-fw"></span>

  <span *ngIf="!routerDropdownOpen" (click)="zoomOut()" class="icon fa fa-search-minus fa-2x fa-fw"></span>

  <span *ngIf="!routerDropdownOpen" (click)="zoomIn()" class="icon fa fa-search-plus fa-2x fa-fw"></span>

</div>
`,
  styles: [ ]
})

export class ClassicControlBarComponent implements OnInit, OnDestroy {

  constructor(private changeDetectionRef: ChangeDetectorRef) {}

  @Input() initialZoomWidth: number;
  @Input() initialZoomHeight: number;
  @Input() panzoomConfig: any;
  private panZoomAPI: PanZoomAPI;
  routerDropdownOpen = false;
  private subscriptions = new Subscription;

  ngOnInit(): void {
    log.debug('ClassicControlBarComponent: OnInit');
    this.subscriptions.add(this.panzoomConfig.api.subscribe( (api: any) => {
      log.debug('ClassicControlBarComponent: newApiSubscription: Got new API');
      this.panZoomAPI = api;
    }));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  zoomIn(): void {
    // log.debug("ClassicControlBarComponent: zoomIn");
    this.panZoomAPI.zoomIn();
  }

  zoomOut(): void {
    // log.debug("ClassicControlBarComponent: zoomOut");
    this.panZoomAPI.zoomOut();
  }

  zoomToFit(): void {
    // log.debug('ClassicControlBarComponent: zoomToFit(): this.initialZoomWidth:', this.initialZoomWidth);
    this.panZoomAPI.resetView();
  }

  onRouterDropdownOpen(open: boolean): void {
    if (open === this.routerDropdownOpen) {
      return;
    }
    log.debug('ClassicControlBarComponent: open:', open);
    this.routerDropdownOpen = open;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }

}
