// IEFE, to prevent our classes from leaking into the parent scope
(function(){
  /**
   * Game board class.  Used for managing who goes, and all interaction with the tiles that make up the game board
   *
   * @type {{
   *   gameboard: Tile[][],
   *   pieceLockEnabled: Boolean,
   *   team1: Team,
   *   team2: Team,
   * }}
   */
  var GameBoard = class {
    /**
     * Game Board constructor
     *
     * @param {string} firstTeam - 1 or 2, the ID of the team who should go first
     * @param {string} gameWidth - string integer of the width of the game board
     * @param {string} gameHeight - string integer of the height of the game board
     */
    constructor(firstTeam, gameWidth, gameHeight) {
      // We only have one game board, so just store these as the constants for mostly laziness
      GameBoard.GAME_BOARD_HEIGHT = Number(gameHeight) || 8;
      GameBoard.GAME_BOARD_WIDTH = Number(gameWidth) || 8;

      // Setup initial game board state
      this.gameboard = [];
      this.pieceLockEnabled = false;

      // Set up both teams
      this.team1 = new Team('black');
      this.team2 = new Team('red');

      // Determine how many rows we will need to put pieces on based on the height of the game board
      var safeHeightValue = Math.min(Math.floor((GameBoard.GAME_BOARD_HEIGHT - 2) / 2), 3);

      // Populate the game board with tiles in rows, placing pieces and labeling their color state
      for (var i = 0; i < GameBoard.GAME_BOARD_HEIGHT; i++) {
        var gameRow = [];

        for (var j = 0; j < GameBoard.GAME_BOARD_WIDTH; j++) {
          var tile = new Tile(this, i, j);

          // Check to see if the tile should be a black or white tile
          if (((j % 2) - (i % 2)) === 0) {
            tile.setBlack();
          }

          // Check to see if we are on the correct spot and place a piece for the associated team with that side
          if ((i < safeHeightValue) && (((j % 2) - (i % 2)) !== 0)) {
            tile.piece = new Piece(this.team1, this);
          } else if ((i > (GameBoard.GAME_BOARD_HEIGHT - (safeHeightValue + 1))) && (((j % 2) - (i % 2)) !== 0)) {
            tile.piece = new Piece(this.team2, this);
          }

          gameRow.push(tile);
        }

        this.gameboard.push(gameRow);
      }

      // Setup who is going right now
      if (firstTeam === '1') {
        this.team1.teamIsGoing = true;
      } else {
        this.team2.teamIsGoing = true;
      }

      this.render();
    }

    /**
     * Clears all active tiles, moves and captures on the game board
     */
    clearActive() {
      for (var row in this.gameboard) {
        if (this.gameboard.hasOwnProperty(row)) {
          for (var tile in this.gameboard[row]) {
            if (this.gameboard[row].hasOwnProperty(tile)) {
              this.gameboard[row][tile].setActive(false);
              this.gameboard[row][tile].validMoveFrom = null;
              this.gameboard[row][tile].validCaptureFrom = null;
            }
          }
        }
      }
    }

    /**
     * Clears all valid moves and captures for the whole game board
     */
    clearValidMoves() {
      for (var row in this.gameboard) {
        if (this.gameboard.hasOwnProperty(row)) {
          for (var tile in this.gameboard[row]) {
            if (this.gameboard[row].hasOwnProperty(tile)) {
              this.gameboard[row][tile].validMoveFrom = null;
              this.gameboard[row][tile].validCaptureFrom = null;
            }
          }
        }
      }
    }

    /**
     * Determines if a location on the game board is in-bounds of the board
     *
     * @param {Number} row
     * @param {Number} column
     *
     * @returns {boolean}
     */
    resolveLocationIsTile(row, column) {
      return !((row < 0) ||
        (row > (GameBoard.GAME_BOARD_HEIGHT - 1)) ||
        (column < 0) ||
        (column > (GameBoard.GAME_BOARD_WIDTH - 1)));
    }

    /**
     * Determines if a tile contains a piece
     *
     * @param {Number} row
     * @param {Number} column
     *
     * @returns {boolean}
     */
    resolveIsOccupied(row, column) {
      return this.gameboard[row][column].piece !== null;
    }

    /**
     * Returns the piece object for a given tile location
     *
     * @param {Number} row
     * @param {Number} column
     *
     * @returns {null|Piece|boolean}
     */
    resolvePiece(row, column) {
      return this.gameboard[row][column].piece;
    }

    /**
     * Moves a piece to the tile specified.  The tile contains information on where the piece is coming from
     *
     * @param {Tile} tile
     */
    movePieceTo(tile) {
      // Move the piece object to its new home by cloning it, then clearing it from the old location
      tile.setPiece(this.gameboard[tile.validMoveFrom[0]][tile.validMoveFrom[1]].piece);
      this.gameboard[tile.validMoveFrom[0]][tile.validMoveFrom[1]].setPiece(null);

      // Have the piece check to see if they are now a king
      tile.piece.checkIfKing(tile.rowIndex);

      this.clearActive();
      this.clearValidMoves();
      this.render();
    }

    /**
     * Moves a piece to the selected tile.  The tile contains the information on where the piece came from.  A piece between the 2 locations has been captured and will be removed
     *
     * @param {Tile} tile
     */
    capturePiece(tile) {
      // Figure out where our captured piece is from
      var capturedPieceY = (tile.rowIndex + tile.validCaptureFrom[0]) / 2;
      var capturedPieceX = (tile.columnIndex + tile.validCaptureFrom[1]) / 2;

      // Move our capturing piece to its new home and clear it from its old location
      tile.setPiece(this.gameboard[tile.validCaptureFrom[0]][tile.validCaptureFrom[1]].piece);
      this.gameboard[tile.validCaptureFrom[0]][tile.validCaptureFrom[1]].setPiece(null);

      // Now remove and change the piece to captured
      this.gameboard[capturedPieceY][capturedPieceX].piece.isCaptured = true
      this.gameboard[capturedPieceY][capturedPieceX].setPiece(null)

      // Have the piece check to see if they are now a king
      tile.piece.checkIfKing(tile.rowIndex);

      this.clearActive();
      this.clearValidMoves();
      this.render();

      // Captures must chain if possible, so have the tile perform a check on any now required moves
      tile.piece.setStateForValidMoves(tile.rowIndex, tile.columnIndex, true, true);
    }

    /**
     * Toggles the state of which team is currently set to do a move
     */
    changeTeamGoing() {
      this.team1.teamIsGoing = !this.team1.teamIsGoing;
      this.team2.teamIsGoing = !this.team2.teamIsGoing;
    }

    /**
     * Render the full game board
     */
    render() {
      // Log out the gameboard on render so people can see how the objects change as  a game is played
      console.log(this);

      var targetElement = document.getElementById('gameboard');

      // Clear the previous render...Will replace these all with tile elements that can do pinpoint updates maybe
      targetElement.innerHTML = '';

      // Render the teams list and their status
      var teamsContainer = document.createElement('div')
      teamsContainer.classList.add('gameboard-teams')

      teamsContainer.appendChild(this.team1.render())
      teamsContainer.appendChild(this.team2.render())

      targetElement.appendChild(teamsContainer);

      // Now render the actual gameboard tiles
      for (var row in this.gameboard) {
        var rowElement = document.createElement('div');
        rowElement.classList.add('gameboard-row');

        if (this.gameboard.hasOwnProperty(row)) {
          for (var column in this.gameboard[row]) {
            if (this.gameboard[row].hasOwnProperty(column)) {
              rowElement.appendChild(this.gameboard[row][column].render());
            }
          }
        }

        targetElement.appendChild(rowElement);
      }

      // Check for victory conditions here.  For now, we are only checking for total victory, not speculative move capability
      if (!this.team1.getRemainingPieces() || !this.team2.getRemainingPieces()) {
        // Render the "You won" overlay
        var teamWonBanner = document.createElement('div');
        teamWonBanner.classList.add('gameboard-team-win');

        var teamWonText = document.createElement('span');

        if (!this.team1.getRemainingPieces()) {
          teamWonText.innerText = 'The red';
        } else {
          teamWonText.innerText = 'The black';
        }

        teamWonText.innerText = teamWonText.innerText + ' team has won. Please refresh for another game';

        teamWonBanner.appendChild(teamWonText);
        targetElement.appendChild(teamWonBanner);
      }
    }
  }

  // Define the default width and height
  GameBoard.GAME_BOARD_WIDTH = 8
  GameBoard.GAME_BOARD_HEIGHT = 8

  /**
   * Tile Class, used to contain pieces and any valid move results when moving a piece
   *
   * @type {{
   *   gameBoard: GameBoard,
   *   piece: Piece|null,
   *   isBlackBackground: Boolean,
   *   isActive: Boolean,
   *   validMoveFrom: Array|null,
   *   validCaptureFrom: Array|null,
   *   renderNode: HTMLElement|null,
   *   rowIndex: Number,
   *   columnIndex: Number,
   * }}
   */
  var Tile = class {
    /**
     * Tile constructor
     *
     * @param {GameBoard} gameBoard
     * @param {Number} rowIndex
     * @param {Number} columnIndex
     */
    constructor(gameBoard, rowIndex, columnIndex) {
      this.gameBoard = gameBoard;
      this.piece = null;
      this.isBlackBackground = false;
      this.isActive = false;
      this.validMoveFrom = null;
      this.validCaptureFrom = null;
      this.renderNode = null;
      this.rowIndex = rowIndex;
      this.columnIndex = columnIndex;
    }

    /**
     * Renders the current tile
     *
     * @returns {null}
     */
    render() {
      // Create the intial render node we will attach our click handler to if it doesn't exist
      if (!this.renderNode) {
        this.renderNode = document.createElement('div');
        this.renderNode.classList.add('gameboard-tile');

        this.renderNode.addEventListener('click', this.handleOnClick.bind(this));

        if (this.isBlackBackground) {
          this.renderNode.classList.add('gameboard-tile-black');
        }
      }

      // Clear the last rendered contents...if a piece moves...it shouldn't remain
      this.renderNode.innerHTML = '';

      // Setup classes for valid moves and captures
      if (this.validMoveFrom === null) {
        this.renderNode.classList.remove('is-valid-move');
      } else {
        this.renderNode.classList.add('is-valid-move');
      }

      if (this.validCaptureFrom === null) {
        this.renderNode.classList.remove('is-valid-capture');
      } else {
        this.renderNode.classList.add('is-valid-capture');
      }

      // Render the piece by asking it to render itself if there is one
      if (this.piece !== null) {
        this.renderNode.appendChild(this.piece.render());
      }

      return this.renderNode;
    }

    /**
     * Handle a click on a tile
     *
     * @param event
     */
    handleOnClick(event) {
      if (this.validMoveFrom) { // If we have a valid move, execute it
        this.gameBoard.movePieceTo(this);
      } else if (this.validCaptureFrom) { // If we have a valid capture, execute it
        this.gameBoard.capturePiece(this);
      } else if (!this.gameBoard.pieceLockEnabled) { // If we are not locked into a move
        if (this.piece && this.piece.team.teamIsGoing) { // If there is a piece and the current team is allowed to move, set up their moves or clear their moves
          if (this.isActive) {
            this.gameBoard.clearActive();
            this.gameBoard.clearValidMoves();
          } else {
            // Tell the gameboard to clear active on all tiles
            this.gameBoard.clearActive();
            this.gameBoard.clearValidMoves();

            this.setActive(true);

            this.piece.setStateForValidMoves(this.rowIndex, this.columnIndex);
          }
        } else {
          this.gameBoard.clearActive();
        }

        this.gameBoard.render();
      }
    }

    /**
     * Set the piece for this
     *
     * @param {Piece|null} piece
     */
    setPiece(piece) {
      this.piece = piece;
    }

    /**
     * Set the active state on this tile
     *
     * @param {Boolean} active
     */
    setActive(active) {
      if (active) {
        this.isActive = active;

        this.renderNode.classList.add('active');
      } else {
        this.isActive = active;

        this.renderNode.classList.remove('active');
      }
    }

    /**
     * Sets the current tile background to black
     */
    setBlack() {
      this.isBlackBackground = true;
    }
  }

  /**
   * Piece Class, for handling movement determination logic and current game state, such as king state
   *
   * @type {{
   *   team: Team,
   *   gameBoard: GameBoard,
   *   isKing: Boolean,
   *   isCaptured: Boolean,
   * }}
   */
  var Piece = class {
    /**
     * Piece Constructor
     *
     * @param {Team} team
     * @param {GameBoard} gameBoard
     */
    constructor(team, gameBoard) {
      this.team = team;
      this.gameBoard = gameBoard;
      this.isKing = false;
      this.isCaptured = false;

      this.team.addPiece(this);
    }

    /**
     * Render the current piece
     *
     * @returns {HTMLSpanElement}
     */
    render() {
      var pieceElement = document.createElement('span');

      pieceElement.classList.add('gameboard-piece');
      pieceElement.classList.add('gameboard-piece-' + this.team.teamColor);

      // If we are a king piece, make sure the user can know
      if (this.isKing) {
        pieceElement.classList.add('gameboard-piece-king');
      }

      return pieceElement;
    }

    /**
     * Sets up the game board tiles with the proper states for all valid moves from the location provided
     *
     * @param {Number} row
     * @param {Number} column
     * @param {Boolean} hasMoved
     * @param {Boolean} hasCaptured
     */
    setStateForValidMoves(row, column, hasMoved, hasCaptured) {
      // have the game board reset the moves state
      this.gameBoard.clearValidMoves()

      // Setup some arrays we can use to store tile states
      var validMoves = [];
      var validCaptures = [];
      var occupiedLocations = [];

      // Alright, find the valid moves for this piece based on its team and state
      if (this.team.teamColor === 'black') {
        if (this.gameBoard.resolveLocationIsTile(row + 1, column - 1)) {
          if (this.gameBoard.resolveIsOccupied(row + 1, column - 1)) {
            occupiedLocations.push([
              row + 1,
              column - 1,
            ])
          } else {
            validMoves.push([
              row + 1,
              column - 1,
            ])
          }
        }

        if (this.gameBoard.resolveLocationIsTile(row + 1, column + 1)) {
          if (this.gameBoard.resolveIsOccupied(row + 1, column + 1)) {
            occupiedLocations.push([
              row + 1,
              column + 1,
            ])
          } else {
            validMoves.push([
              row + 1,
              column + 1,
            ])
          }
        }
      } else {
        if (this.gameBoard.resolveLocationIsTile(row - 1, column - 1)) {
          if (this.gameBoard.resolveIsOccupied(row - 1, column - 1)) {
            occupiedLocations.push([
              row - 1,
              column - 1,
            ])
          } else {
            validMoves.push([
              row - 1,
              column - 1,
            ])
          }
        }

        if (this.gameBoard.resolveLocationIsTile(row - 1, column + 1)) {
          if (this.gameBoard.resolveIsOccupied(row - 1, column + 1)) {
            occupiedLocations.push([
              row - 1,
              column + 1,
            ])
          } else {
            validMoves.push([
              row - 1,
              column + 1,
            ])
          }
        }
      }

      // Kings can move in any direction
      if (this.isKing) {
        if (this.team.teamColor === 'black') {
          if (this.gameBoard.resolveLocationIsTile(row - 1, column - 1)) {
            if (this.gameBoard.resolveIsOccupied(row - 1, column - 1)) {
              occupiedLocations.push([
                row - 1,
                column - 1,
              ])
            } else {
              validMoves.push([
                row - 1,
                column - 1,
              ])
            }
          }

          if (this.gameBoard.resolveLocationIsTile(row - 1, column + 1)) {
            if (this.gameBoard.resolveIsOccupied(row - 1, column + 1)) {
              occupiedLocations.push([
                row - 1,
                column + 1,
              ])
            } else {
              validMoves.push([
                row - 1,
                column + 1,
              ])
            }
          }
        } else {
          if (this.gameBoard.resolveLocationIsTile(row + 1, column - 1)) {
            if (this.gameBoard.resolveIsOccupied(row + 1, column - 1)) {
              occupiedLocations.push([
                row + 1,
                column - 1,
              ])
            } else {
              validMoves.push([
                row + 1,
                column - 1,
              ])
            }
          }

          if (this.gameBoard.resolveLocationIsTile(row + 1, column + 1)) {
            if (this.gameBoard.resolveIsOccupied(row + 1, column + 1)) {
              occupiedLocations.push([
                row + 1,
                column + 1,
              ])
            } else {
              validMoves.push([
                row + 1,
                column + 1,
              ])
            }
          }
        }
      }

      // Now resolve what valid captures there are
      for (var occupiedLocation in occupiedLocations) {
        // Go to the other side of the occupied location if the piece is not part of the same team
        if (occupiedLocations.hasOwnProperty(occupiedLocation)) {
          if (this.gameBoard.resolvePiece(occupiedLocations[occupiedLocation][0], occupiedLocations[occupiedLocation][1]).team.teamColor !== this.team.teamColor) {
            // Alright, not the same team, check the space on the other side
            var newY = (row - (row - occupiedLocations[occupiedLocation][0])) + ((row < occupiedLocations[occupiedLocation][0]) ? 1 : -1);
            var newX = (column - (column - occupiedLocations[occupiedLocation][1])) + ((column < occupiedLocations[occupiedLocation][1]) ? 1 : -1);

            if (this.gameBoard.resolveLocationIsTile(newY, newX)) {
              if (!this.gameBoard.resolveIsOccupied(newY, newX)) {
                validCaptures.push([
                  newY,
                  newX,
                ])
              }
            }
          }
        }
      }

      // Go to each tile and set up the state they need to be in
      if (!hasCaptured) {
        for (var validMove in validMoves) {
          if (validMoves.hasOwnProperty(validMove)) {
            this.gameBoard.gameboard[validMoves[validMove][0]][validMoves[validMove][1]].validMoveFrom = [row, column];
          }
        }
      }

      for (var validCapture in validCaptures) {
        if (validCaptures.hasOwnProperty(validCapture)) {
          this.gameBoard.gameboard[validCaptures[validCapture][0]][validCaptures[validCapture][1]].validCaptureFrom = [row, column];
        }
      }

      // Do some post-setup checks
      if (hasCaptured && validCaptures.length) { // If we did a capture and have captures, FORCE the team to move that piece again until we no longer have moves
        this.gameBoard.pieceLockEnabled = true;
      } else if (hasCaptured && !validCaptures.length) { // We have captured, but can no longer capture...their turn has ended
        this.gameBoard.clearValidMoves();
        this.gameBoard.changeTeamGoing();

        this.gameBoard.pieceLockEnabled = false;
      } else if (hasMoved && !hasCaptured) { // We moved without a capture, their turn has ended
        this.gameBoard.clearValidMoves();
        this.gameBoard.changeTeamGoing();

        this.gameBoard.pieceLockEnabled = false;
      }

      this.gameBoard.render();
    }

    /**
     * Checks if the current row index makes our current piece a king
     *
     * @param {Number} row
     */
    checkIfKing(row) {
      // Black kings at the bottom of the board, red at the top
      if (this.team.teamColor === 'black') {
        if (row === (GameBoard.GAME_BOARD_HEIGHT - 1)) {
          this.isKing = true;
        }
      } else if (row === 0) {
        this.isKing = true;
      }
    }
  }

  /**
   * Team class.  Contains a list of all pieces and handles rendering team game state
   *
   * @type {{
   *   teamColor: string,
   *   teamIsGoing: Boolean,
   *   pieces: Piece[],
   * }}
   */
  var Team = class {
    /**
     * Team constructor
     *
     * @param teamColor
     */
    constructor(teamColor) {
      this.teamColor = teamColor;
      this.teamIsGoing = false;

      this.pieces = [];
    }

    /**
     * Add a piece to this team
     *
     * @param {Piece} piece
     */
    addPiece(piece) {
      this.pieces.push(piece);
    }

    /**
     * Determine the number of pieces left on the board
     *
     * @returns {number}
     */
    getRemainingPieces() {
      var remaining = 0;

      for (var piece in this.pieces) {
        if (this.pieces.hasOwnProperty(piece)) {
          if (!this.pieces[piece].isCaptured) {
            remaining++;
          }
        }
      }

      return remaining;
    }

    /**
     * Render the active team state and pieces left for above the game board
     *
     * @returns {HTMLDivElement}
     */
    render() {
      var teamDisplay = document.createElement('div');
      var teamName = document.createElement('span');
      var piecesLeft = document.createElement('span');

      teamDisplay.classList.add('team-display');
      teamDisplay.classList.add('team-display-' + this.teamColor);

      if (this.teamIsGoing) {
        teamDisplay.classList.add('is-going');
      }

      teamName.classList.add('team-display-name');

      piecesLeft.classList.add('team-display-pieces');

      teamName.innerHTML = this.teamColor.substr(0, 1).toUpperCase() + this.teamColor.substr(1) + ' Team';
      piecesLeft.innerText = this.getRemainingPieces().toString();

      if (this.getRemainingPieces() === 1) {
        piecesLeft.innerText = piecesLeft.innerText + ' piece left'
      } else {
        piecesLeft.innerText = piecesLeft.innerText + ' pieces left'
      }

      teamDisplay.appendChild(teamName);
      teamDisplay.appendChild(piecesLeft);

      return teamDisplay;
    }
  }

  // Export the GameBoard to the window so it can be used by the setup form
  window.GameBoard = GameBoard;
}())