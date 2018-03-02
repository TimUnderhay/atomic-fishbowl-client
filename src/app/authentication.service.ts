import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { toPromise } from 'rxjs/operator/toPromise';
import { HttpHeaders, HttpClient } from '@angular/common/http';
import { User } from './user';
import { ToolService } from './tool.service';
import { DataService } from './data.service';
declare var log;

@Injectable()

export class AuthenticationService {

  constructor(  private dataService: DataService,
                private router: Router,
                private http: HttpClient,
                private toolService: ToolService ) {
                  this.toolService.logout.subscribe( () => {
                    // log.debug('got to 4');
                    this.logout();
                  } );
                }

  public loggedInChanged: Subject<boolean> = new Subject<boolean>();
  private apiUrl = '/api';
  public loggedInUser: User;
  public clientSessionId: number;



  public logout(): void {
    log.debug('AuthenticationService: logout(): logging out');
    this.dataService.leaveCollection();
    this.http.get(this.apiUrl + '/logout' )
                    .toPromise()
                    .then( () => {
                      // log.debug('got to 2');
                      this.loggedInUser = null;
                      this.loggedInChanged.next(false);
                    } )
                    .catch( (err) => {
                      if (err.status !== 401) {
                        // log.debug('got to 3');
                        log.error('AuthenticationService: logout(): ERROR during logout:', err);
                      }
                    });
  }



  public login(u: User): Promise<boolean> {
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    let user: User = { username: u.username, password: u.password};
    return this.http.post(this.apiUrl + '/login', user, { headers } )
    .toPromise()
    .then( (response: any) => {
      let res = response;
      log.debug('AuthenticationService: login(): Got login response:', res);
                      this.loggedInUser = res.user;
                      this.clientSessionId = res.sessionId;
                      this.toolService.clientSessionId.next(this.clientSessionId);
                      return this.dataService.init();
                    })
                    .then( () => {
                      this.loggedInChanged.next(true);
                      // this.router.navigate(['/']);
                      return true;
                    })
                    .catch( (e: any) => {
                      if (e.status === 401) {
                        this.loggedInChanged.next(false);
                        return false;
                      }
                    });
  }



  isLoggedIn(): Promise<boolean> {
    log.debug('AuthenticationService: isLoggedIn()');
    return this.http.get(this.apiUrl + '/isloggedin' )
                    .toPromise()
                    .then( (res: any) => {
                      this.loggedInUser = res.user;
                      this.clientSessionId = res.sessionId;
                      this.toolService.clientSessionId.next(this.clientSessionId);
                      return true;
                    })
                    .catch( () => {
                      return Promise.reject(false);
                    });
  }



  checkCredentials(): Promise<any> {
    // log.debug('AuthenticationService: checkCredentials()');
    return this.isLoggedIn()
              .then( () => {
                return this.dataService.init();
               } )
              .then( () => {
                this.loggedInChanged.next(true);
                return true;
              })
              .catch( () => {
                this.loggedInChanged.next(false);
                return false;
              } );
  }



  handleError(error: any): Promise<any> {
    log.error('ERROR: ', error);
    return Promise.reject(error.message || error);
  }

}
