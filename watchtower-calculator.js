/**
 * 見張り台 最短ルート計算ロジック
 *
 * ルール
 * - 1マス = 座標3
 * - 基準境界 X=728 / Y=572
 * - 見張り台1個 = 3×3マス
 * - 新しい見張り台は既存領地と辺で接続する
 * - 角だけの接触は不可
 * - 見張り台同士の重なりは許可
 * - 目的地は、見張り台領地に含まれるか、辺で接すれば到達
 * - 最小個数を最優先し、その中から推奨ルートを1つ選ぶ
 */

(() => {
  "use strict";

  const GRID_SIZE = 3;
  const X_BOUNDARY = 728;
  const Y_BOUNDARY = 572;


  // ========================================
  // 基本処理
  // ========================================

  function sign(value) {
    return value > 0 ? 1 : value < 0 ? -1 : 0;
  }


  function clamp(value, min, max) {
    return Math.max(
      min,
      Math.min(max, value)
    );
  }


  /**
   * 実座標からマス番号を取得
   */
  function coordinateToCellIndex(
    value,
    boundary
  ) {
    return Math.floor(
      (value - boundary) / GRID_SIZE
    );
  }


  /**
   * マス番号から代表座標を取得
   */
  function cellIndexToRepresentative(
    index,
    boundary
  ) {
    return (
      boundary +
      index * GRID_SIZE +
      1
    );
  }


  /**
   * 入力座標をマス単位へ変換
   */
  function normalizePoint(
    x,
    y
  ) {
    const cellX =
      coordinateToCellIndex(
        x,
        X_BOUNDARY
      );

    const cellY =
      coordinateToCellIndex(
        y,
        Y_BOUNDARY
      );

    return {
      inputX: x,
      inputY: y,

      cellX,
      cellY,

      representativeX:
        cellIndexToRepresentative(
          cellX,
          X_BOUNDARY
        ),

      representativeY:
        cellIndexToRepresentative(
          cellY,
          Y_BOUNDARY
        ),
    };
  }


  /**
   * スタートと目的地が、
   * すでに同一マスまたは辺で接しているか
   */
  function isAlreadyConnected(
    dx,
    dy
  ) {
    return (
      (
        dx === 0 &&
        Math.abs(dy) <= 1
      ) ||
      (
        dy === 0 &&
        Math.abs(dx) <= 1
      )
    );
  }


  /**
   * 見張り台が目的地に到達しているか
   */
  function towerReachesCell(
    cx,
    cy,
    targetX,
    targetY
  ) {
    const dx =
      Math.abs(
        targetX - cx
      );

    const dy =
      Math.abs(
        targetY - cy
      );

    const inside =
      dx <= 1 &&
      dy <= 1;

    const edgeTouch =
      (
        dx === 2 &&
        dy <= 1
      ) ||
      (
        dy === 2 &&
        dx <= 1
      );

    return (
      inside ||
      edgeTouch
    );
  }


  // ========================================
  // 建設可能位置
  // ========================================

  /**
   * 最初の見張り台候補
   *
   * スタート地点の1マス領地と、
   * 辺で接する3×3領地のみ
   */
  function getFirstTowerCandidates() {
    const result = [];

    for (
      let cx = -2;
      cx <= 2;
      cx++
    ) {
      for (
        let cy = -2;
        cy <= 2;
        cy++
      ) {
        const ax =
          Math.abs(cx);

        const ay =
          Math.abs(cy);

        if (
          (
            ax === 2 &&
            ay <= 1
          ) ||
          (
            ay === 2 &&
            ax <= 1
          )
        ) {
          result.push({
            x: cx,
            y: cy,
          });
        }
      }
    }

    return result;
  }


  /**
   * 2個目以降の
   * 見張り台中心の移動候補
   */
  function getTowerMoveDeltas() {
    const result = [];

    for (
      let dx = -3;
      dx <= 3;
      dx++
    ) {
      for (
        let dy = -3;
        dy <= 3;
        dy++
      ) {
        if (
          dx === 0 &&
          dy === 0
        ) {
          continue;
        }

        const ax =
          Math.abs(dx);

        const ay =
          Math.abs(dy);

        /**
         * ±3, ±3 は角接触のみになるため除外
         */
        if (
          ax <= 3 &&
          ay <= 3 &&
          !(
            ax === 3 &&
            ay === 3
          )
        ) {
          result.push({
            x: dx,
            y: dy,
          });
        }
      }
    }

    return result;
  }


  const FIRST_TOWER_CANDIDATES =
    getFirstTowerCandidates();

  const TOWER_MOVE_DELTAS =
    getTowerMoveDeltas();


  // ========================================
  // 推奨ルート選択
  // ========================================

  /**
   * 主方向を決定
   *
   * 縦横が同距離の場合は
   * 縦方向を優先
   */
  function getMainAxis(
    dx,
    dy
  ) {
    return (
      Math.abs(dy) >=
      Math.abs(dx)
    )
      ? "y"
      : "x";
  }


  /**
   * 最初の見張り台の
   * 理想位置
   */
  function getIdealFirstMove(
    dx,
    dy
  ) {
    const mainAxis =
      getMainAxis(
        dx,
        dy
      );

    const sx =
      sign(dx);

    const sy =
      sign(dy);

    if (
      mainAxis === "y"
    ) {
      return {
        x:
          dx === 0
            ? 0
            : sx,

        y:
          sy * 2,
      };
    }

    return {
      x:
        sx * 2,

      y:
        dy === 0
          ? 0
          : sy,
    };
  }


  /**
   * 2個目以降の
   * 理想移動
   */
  function getIdealNextMove(
    currentX,
    currentY,
    targetX,
    targetY
  ) {
    const mainAxis =
      getMainAxis(
        targetX,
        targetY
      );

    const sx =
      sign(targetX);

    const sy =
      sign(targetY);

    if (
      mainAxis === "y"
    ) {
      const remainingX =
        targetX -
        currentX;

      return {
        x:
          clamp(
            remainingX,
            -2,
            2
          ),

        y:
          sy * 3,
      };
    }

    const remainingY =
      targetY -
      currentY;

    return {
      x:
        sx * 3,

      y:
        clamp(
          remainingY,
          -2,
          2
        ),
    };
  }


  function movePenalty(
    actualX,
    actualY,
    idealX,
    idealY
  ) {
    return (
      Math.abs(
        actualX - idealX
      ) +
      Math.abs(
        actualY - idealY
      )
    );
  }


  // ========================================
  // 最短ルート探索
  // ========================================

  function findShortestRoute(
    targetX,
    targetY
  ) {
    const padding = 6;

    const minX =
      Math.min(
        0,
        targetX
      ) -
      padding;

    const maxX =
      Math.max(
        0,
        targetX
      ) +
      padding;

    const minY =
      Math.min(
        0,
        targetY
      ) -
      padding;

    const maxY =
      Math.max(
        0,
        targetY
      ) +
      padding;


    const idealFirst =
      getIdealFirstMove(
        targetX,
        targetY
      );


    let layer =
      new Map();


    /**
     * 最初の見張り台候補
     */
    for (
      const candidate
      of FIRST_TOWER_CANDIDATES
    ) {
      if (
        candidate.x < minX ||
        candidate.x > maxX ||
        candidate.y < minY ||
        candidate.y > maxY
      ) {
        continue;
      }

      const score =
        movePenalty(
          candidate.x,
          candidate.y,
          idealFirst.x,
          idealFirst.y
        );

      const key =
        `${candidate.x},${candidate.y}`;

      layer.set(
        key,
        {
          x:
            candidate.x,

          y:
            candidate.y,

          score,

          path: [
            {
              x:
                candidate.x,

              y:
                candidate.y,
            },
          ],
        }
      );
    }


    /**
     * 探索上限
     */
    const maxDepth =
      Math.ceil(
        (
          Math.abs(targetX) +
          Math.abs(targetY)
        ) / 2
      ) + 20;


    /**
     * BFS
     */
    for (
      let depth = 1;
      depth <= maxDepth;
      depth++
    ) {
      const reached = [];


      /**
       * この深さで目的地へ
       * 到達している候補を探す
       */
      for (
        const node
        of layer.values()
      ) {
        if (
          towerReachesCell(
            node.x,
            node.y,
            targetX,
            targetY
          )
        ) {
          reached.push(
            node
          );
        }
      }


      /**
       * 最短ルート発見
       */
      if (
        reached.length > 0
      ) {
        reached.sort(
          (a, b) =>
            a.score -
            b.score
        );

        return {
          count:
            depth,

          route:
            reached[0].path,

          score:
            reached[0].score,
        };
      }


      /**
       * 次の深さへ
       */
      const nextLayer =
        new Map();


      for (
        const node
        of layer.values()
      ) {
        const ideal =
          getIdealNextMove(
            node.x,
            node.y,
            targetX,
            targetY
          );


        for (
          const delta
          of TOWER_MOVE_DELTAS
        ) {
          const nextX =
            node.x +
            delta.x;

          const nextY =
            node.y +
            delta.y;


          if (
            nextX < minX ||
            nextX > maxX ||
            nextY < minY ||
            nextY > maxY
          ) {
            continue;
          }


          const nextScore =
            node.score +
            movePenalty(
              delta.x,
              delta.y,
              ideal.x,
              ideal.y
            );


          const key =
            `${nextX},${nextY}`;

          const existing =
            nextLayer.get(
              key
            );


          if (
            !existing ||
            nextScore <
              existing.score
          ) {
            nextLayer.set(
              key,
              {
                x:
                  nextX,

                y:
                  nextY,

                score:
                  nextScore,

                path: [
                  ...node.path,

                  {
                    x:
                      nextX,

                    y:
                      nextY,
                  },
                ],
              }
            );
          }
        }
      }


      layer =
        nextLayer;
    }


    throw new Error(
      "最短ルートを探索できませんでした。"
    );
  }


  // ========================================
  // 案内文章
  // ========================================

  function getDirectionInfo(
    dx,
    dy
  ) {
    const mainAxis =
      getMainAxis(
        dx,
        dy
      );

    const sx =
      sign(dx);

    const sy =
      sign(dy);

    let mainDirection;
    let sideDirection =
      null;


    if (
      mainAxis === "y"
    ) {
      mainDirection =
        sy > 0
          ? "上"
          : "下";

      if (
        dx > 0
      ) {
        sideDirection =
          "右";
      }

      if (
        dx < 0
      ) {
        sideDirection =
          "左";
      }

    } else {
      mainDirection =
        sx > 0
          ? "右"
          : "左";

      if (
        dy > 0
      ) {
        sideDirection =
          "上";
      }

      if (
        dy < 0
      ) {
        sideDirection =
          "下";
      }
    }


    return {
      mainAxis,
      mainDirection,
      sideDirection,
    };
  }


  /**
   * 最初の建設位置についての案内
   */
  function buildStartInstruction(
    dx,
    dy
  ) {
    const {
      mainAxis,
      mainDirection,
      sideDirection,
    } =
      getDirectionInfo(
        dx,
        dy
      );


    let positionText;


    if (
      !sideDirection
    ) {
      if (
        mainAxis === "y"
      ) {
        positionText =
          mainDirection === "上"
            ? "真上"
            : "真下";

      } else {
        positionText =
          "真横";
      }

    } else {
      positionText =
        `やや${sideDirection}寄り`;
    }


    return (
      `スタート地点の` +
      `【強調】${mainDirection}側の辺【/強調】` +
      `に接するように、` +
      `【強調】${positionText}【/強調】` +
      `から建設してください。`
    );
  }


  /**
   * 最終見張り台が
   * 目的地のどちら側にあるか
   */
  function getApproachSideFromFinalTower(
    finalTower,
    targetX,
    targetY,
    mainAxis,
    mainDirection
  ) {
    const dx =
      targetX -
      finalTower.x;

    const dy =
      targetY -
      finalTower.y;


    /**
     * 左右から辺接触
     */
    if (
      Math.abs(dx) === 2 &&
      Math.abs(dy) <= 1
    ) {
      return (
        dx > 0
          ? "左"
          : "右"
      );
    }


    /**
     * 上下から辺接触
     */
    if (
      Math.abs(dy) === 2 &&
      Math.abs(dx) <= 1
    ) {
      return (
        dy > 0
          ? "下"
          : "上"
      );
    }


    /**
     * 目的地が3×3内にある場合
     */
    if (
      mainAxis === "y"
    ) {
      return (
        mainDirection === "上"
          ? "下"
          : "上"
      );
    }


    return (
      mainDirection === "右"
        ? "左"
        : "右"
    );
  }


  /**
   * 建設のポイントを作成
   */
  function buildGuidance(
    dx,
    dy,
    route
  ) {
    const absX =
      Math.abs(dx);

    const absY =
      Math.abs(dy);


    const {
      mainAxis,
      mainDirection,
      sideDirection,
    } =
      getDirectionInfo(
        dx,
        dy
      );


    const sideDistance =
      mainAxis === "y"
        ? absX
        : absY;


    const notes = [
      buildStartInstruction(
        dx,
        dy
      ),
    ];


    // ----------------------------------------
    // ほぼ真上・真下・真横
    // ----------------------------------------

    if (
      sideDistance <= 2
    ) {
      notes.push(
        `【強調】${mainDirection}方向にはピッタリ【/強調】のため、` +
        `${mainDirection}方向の` +
        `【強調】建設位置にご注意ください【/強調】。`
      );


      if (
        mainAxis === "y"
      ) {
        const position =
          sideDistance === 0
            ? `真${mainDirection}`
            : `概ね真${mainDirection}`;


        notes.push(
          `目的地は` +
          `【強調】${position}【/強調】` +
          `にあるため、` +
          `【強調】左右は大きくずらさなければ問題ありません【/強調】。`
        );

      } else {
        const position =
          sideDistance === 0
            ? "真横"
            : "概ね真横";


        notes.push(
          `目的地は` +
          `【強調】${position}【/強調】` +
          `のため、` +
          `【強調】上下は大きくずらさなければ問題ありません【/強調】。`
        );
      }


      return notes;
    }


    // ----------------------------------------
    // 途中まで斜め、その後ほぼ直進
    // ----------------------------------------

    const adjustUntil =
      sideDistance <= 1
        ? 1
        : 1 +
          Math.ceil(
            (
              sideDistance -
              1
            ) / 2
          );


    if (
      adjustUntil <=
      route.length - 2
    ) {
      notes.push(
        `【強調】${adjustUntil}個目あたりまで【/強調】は、` +
        `${mainDirection}側に接するように` +
        `【強調】やや${sideDirection}寄り【/強調】` +
        `で建設してください。`
      );


      let straightText;


      if (
        mainAxis === "y"
      ) {
        straightText =
          mainDirection === "上"
            ? "ほぼ真上"
            : "ほぼ真下";

      } else {
        straightText =
          "ほぼ真横";
      }


      notes.push(
        `その後は目的地が` +
        `【強調】${straightText}【/強調】` +
        `になるため、` +
        `【強調】${straightText}【/強調】` +
        `に建設していけば到達できます。`
      );


      return notes;
    }


    // ----------------------------------------
    // 最後まで斜め方向を使うケース
    // ----------------------------------------

    const finalTower =
      route[
        route.length - 1
      ];


    const approachSide =
      getApproachSideFromFinalTower(
        finalTower,
        dx,
        dy,
        mainAxis,
        mainDirection
      );


    const horizontalDirection =
      dx > 0
        ? "右"
        : dx < 0
        ? "左"
        : null;


    const verticalDirection =
      dy > 0
        ? "上"
        : dy < 0
        ? "下"
        : null;


    if (
      horizontalDirection &&
      verticalDirection
    ) {
      notes.push(
        `目的地の` +
        `【強調】${approachSide}側に接する【/強調】` +
        `ように建設することを想定した場合、` +
        `【強調】${horizontalDirection}方向に2マス、` +
        `${verticalDirection}方向に2マスの余裕【/強調】` +
        `があります。`
      );
    }


    return notes;
  }


  // ========================================
  // メイン計算
  // ========================================

  function calculateWatchtowers(
    startX,
    startY,
    destinationX,
    destinationY
  ) {
    const start =
      normalizePoint(
        startX,
        startY
      );


    const destination =
      normalizePoint(
        destinationX,
        destinationY
      );


    const dx =
      destination.cellX -
      start.cellX;


    const dy =
      destination.cellY -
      start.cellY;


    /**
     * すでに接している場合
     */
    if (
      isAlreadyConnected(
        dx,
        dy
      )
    ) {
      return {
        status:
          "already_connected",

        start,
        destination,

        dx,
        dy,

        count:
          0,

        message:
          "目的地には接しているようです。スタート地点、または目的地の座標入力に誤りがないか確認してください。",

        route: [],

        routeCoordinates: [],

        guidance: [],
      };
    }


    /**
     * 最短ルート計算
     */
    const shortest =
      findShortestRoute(
        dx,
        dy
      );


    /**
     * 推奨建築座標を
     * 実際のゲーム座標へ変換
     */
    const routeCoordinates =
      shortest.route.map(
        (
          tower,
          index
        ) => {
          const absoluteCellX =
            start.cellX +
            tower.x;


          const absoluteCellY =
            start.cellY +
            tower.y;


          return {
            number:
              index + 1,

            relativeCellX:
              tower.x,

            relativeCellY:
              tower.y,

            x:
              cellIndexToRepresentative(
                absoluteCellX,
                X_BOUNDARY
              ),

            y:
              cellIndexToRepresentative(
                absoluteCellY,
                Y_BOUNDARY
              ),
          };
        }
      );


    /**
     * 建設ポイント文章生成
     */
    const guidance =
      buildGuidance(
        dx,
        dy,
        shortest.route
      );


    return {
      status:
        "ok",

      start,
      destination,

      dx,
      dy,

      count:
        shortest.count,

      route:
        shortest.route,

      routeCoordinates,

      guidance,
    };
  }


  // ========================================
  // HTML側へ公開
  // ========================================

  window.WatchtowerCalculator = {
    calculate:
      calculateWatchtowers,
  };

})();