(function(){
  var GameBoard = class {
    constructor(firstTeam, gameWidth, gameHeight) {
      GameBoard.GAME_BOARD_HEIGHT = Number(gameHeight) || 8;
      GameBoard.GAME_BOARD_WIDTH = Number(gameWidth) || 8;

      this.gameboard = [];
      this.pieceLockEnabled = false;

      this.team1 = new Team('black');
      this.team2 = new Team('red');

      var safeHeightValue = Math.min(Math.floor((GameBoard.GAME_BOARD_HEIGHT - 2) / 2), 3);

      for (var i = 0; i < GameBoard.GAME_BOARD_HEIGHT; i++) {
        var gameRow = [];

        for (var j = 0; j < GameBoard.GAME_BOARD_WIDTH; j++) {
          var tile = new Tile(this, i, j);

          // Check to see if the tile should be a black or white tile
          if (((j % 2) - (i % 2)) === 0) {
            tile.setBlack();
          }

          if ((i < safeHeightValue) && (((j % 2) - (i % 2)) !== 0)) {
            // Check to see if we are on the correct spot and place a piece we construct for the black team
            tile.piece = new Piece(this.team1, this);
          } else if ((i > (GameBoard.GAME_BOARD_HEIGHT - (safeHeightValue + 1))) && (((j % 2) - (i % 2)) !== 0)) {
            tile.piece = new Piece(this.team2, this);
          }

          gameRow.push(tile);
        }

        this.gameboard.push(gameRow);
      }

      if (firstTeam === '1') {
        this.team1.teamIsGoing = true;
      } else {
        this.team2.teamIsGoing = true;
      }


      this.render();
    }

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

    resolveLocationIsTile(row, column) {
      return !((row < 0) ||
        (row > (GameBoard.GAME_BOARD_HEIGHT - 1)) ||
        (column < 0) ||
        (column > (GameBoard.GAME_BOARD_WIDTH - 1)));
    }

    resolveIsOccupied(row, column) {
      return this.gameboard[row][column].piece !== null;
    }

    resolvePiece(row, column) {
      if (!this.resolveLocationIsTile()) {
        return false;
      }

      return this.gameboard[row][column].piece;
    }

    movePieceTo(tile) {
      tile.setPiece(this.gameboard[tile.validMoveFrom[0]][tile.validMoveFrom[1]].piece);
      this.gameboard[tile.validMoveFrom[0]][tile.validMoveFrom[1]].setPiece(null);

      // Have the piece check to see if they are now a king
      tile.piece.checkIfKing(tile.rowIndex);

      this.clearActive();
      this.clearValidMoves();
      this.render();

      tile.piece.setStateForValidMoves(tile.rowIndex, tile.columnIndex, true);
    }

    capturePiece(tile) {
      var capturedPieceY = (tile.rowIndex + tile.validCaptureFrom[0]) / 2;
      var capturedPieceX = (tile.columnIndex + tile.validCaptureFrom[1]) / 2;

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

      tile.piece.setStateForValidMoves(tile.rowIndex, tile.columnIndex, true, true);
    }

    changeTeamGoing() {
      this.team1.teamIsGoing = !this.team1.teamIsGoing;
      this.team2.teamIsGoing = !this.team2.teamIsGoing;
    }

    render() {
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

      // Now render the actual gameboard
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

  GameBoard.GAME_BOARD_WIDTH = 8
  GameBoard.GAME_BOARD_HEIGHT = 8

  var Tile = class {
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

    render() {
      if (!this.renderNode) {
        this.renderNode = document.createElement('div');
        this.renderNode.classList.add('gameboard-tile');

        this.renderNode.addEventListener('click', this.handleOnClick.bind(this));

        if (this.isBlackBackground) {
          this.renderNode.classList.add('gameboard-tile-black');
        }
      }

      this.renderNode.innerHTML = '';

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

      if (this.piece !== null) {
        this.renderNode.appendChild(this.piece.render());
      }

      return this.renderNode;
    }

    handleOnClick(event) {
      if (this.validMoveFrom) {
        this.gameBoard.movePieceTo(this);
      } else if (this.validCaptureFrom) {
        this.gameBoard.capturePiece(this);
      } else if (!this.gameBoard.pieceLockEnabled) {
        if (this.piece && this.piece.team.teamIsGoing) {
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

    setPiece(piece) {
      this.piece = piece;
    }

    setActive(active) {
      if (active) {
        this.isActive = active;

        this.renderNode.classList.add('active');
      } else {
        this.isActive = active;

        this.renderNode.classList.remove('active');
      }
    }

    setBlack() {
      this.isBlackBackground = true;
    }
  }

  var Piece = class {
    constructor(team, gameBoard) {
      this.team = team;
      this.gameBoard = gameBoard;
      this.isKing = false;
      this.isCaptured = false;

      this.team.addPiece(this);
    }

    render() {
      var pieceElement = document.createElement('span');

      pieceElement.classList.add('gameboard-piece');
      pieceElement.classList.add('gameboard-piece-' + this.team.teamColor);

      if (this.isKing) {
        pieceElement.classList.add('gameboard-piece-king');
      }

      return pieceElement;
    }

    setStateForValidMoves(row, column, hasMoved, hasCaptured) {
      // have the game board reset the moves state
      this.gameBoard.clearValidMoves()

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

      if (hasCaptured && validCaptures.length) {
        this.gameBoard.pieceLockEnabled = true;
      } else if (hasCaptured && !validCaptures.length) {
        this.gameBoard.clearValidMoves();
        this.gameBoard.changeTeamGoing();

        this.gameBoard.pieceLockEnabled = false;
      } else if (hasMoved && !hasCaptured) {
        this.gameBoard.clearValidMoves();
        this.gameBoard.changeTeamGoing();

        this.gameBoard.pieceLockEnabled = false;
      }

      this.gameBoard.render();
    }

    checkIfKing(row) {
      if (this.team.teamColor === 'black') {
        if (row === (GameBoard.GAME_BOARD_HEIGHT - 1)) {
          this.isKing = true;
        }
      } else if (row === 0) {
        this.isKing = true;
      }
    }

    setIsCaptured() {
      this.isCaptured = true;
    }
  }

  var Team = class {
    constructor(teamColor) {
      this.teamColor = teamColor;
      this.teamIsGoing = false;
      this.hasRequiredMove = false;

      this.pieces = [];
    }

    addPiece(piece) {
      this.pieces.push(piece);
    }

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

  window.GameBoard = GameBoard;
}())