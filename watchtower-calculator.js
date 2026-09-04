/**
 * 見張り台 必要数・推奨ルート計算
 *
 * --------------------------------------------------
 * マップ
 * --------------------------------------------------
 * 地域
 *   X基準線 = 728
 *   Y基準線 = 572
 *
 * IR
 *   X基準線 = 122
 *   Y基準線 = 324
 *
 * --------------------------------------------------
 * 共通ルール
 * --------------------------------------------------
 * ・1マス = 座標3
 * ・見張り台1個 = 3×3マス
 * ・新しい見張り台は既存領地と辺で接する必要がある
 * ・角だけの接触は不可
 * ・見張り台同士の重なりは可
 * ・目的地は3×3領地内、または辺に接すれば到達
 * ・必要個数は最小数を最優先
 */

(() => {
  "use strict";


  // ==================================================
  // マップ設定
  // ==================================================

  const GRID_SIZE = 3;


  const MAP_SETTINGS = {
    region: {
      name: "地域",
      xBoundary: 728,
      yBoundary: 572,
    },

    ir: {
      name: "IR",
      xBoundary: 122,
      yBoundary: 324,
    },
  };


  // ==================================================
  // 共通関数
  // ==================================================

  function sign(value) {
    if (value > 0) {
      return 1;
    }

    if (value < 0) {
      return -1;
    }

    return 0;
  }


  function clamp(
    value,
    min,
    max
  ) {
    return Math.max(
      min,
      Math.min(
        max,
        value
      )
    );
  }


  // ==================================================
  // 座標 → マス
  // ==================================================

  function coordinateToCellIndex(
    value,
    boundary
  ) {
    return Math.floor(
      (value - boundary) /
      GRID_SIZE
    );
  }


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


  function normalizePoint(
    x,
    y,
    mapSetting
  ) {
    const cellX =
      coordinateToCellIndex(
        x,
        mapSetting.xBoundary
      );


    const cellY =
      coordinateToCellIndex(
        y,
        mapSetting.yBoundary
      );


    return {
      inputX: x,
      inputY: y,

      cellX,
      cellY,

      representativeX:
        cellIndexToRepresentative(
          cellX,
          mapSetting.xBoundary
        ),

      representativeY:
        cellIndexToRepresentative(
          cellY,
          mapSetting.yBoundary
        ),
    };
  }


  // ==================================================
  // 到達判定
  // ==================================================

  /**
   * スタート地点と目的地が
   * 同一マス、または辺で接しているか
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
   * 見張り台から目的地へ到達しているか
   *
   * 3×3内
   * または
   * 辺接触
   */
  function towerReachesCell(
    towerX,
    towerY,
    targetX,
    targetY
  ) {
    const dx =
      Math.abs(
        targetX - towerX
      );


    const dy =
      Math.abs(
        targetY - towerY
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


  // ==================================================
  // 建設可能位置
  // ==================================================

  /**
   * 1個目の見張り台候補
   *
   * スタート地点は1マスだけを
   * 所有領地として扱う。
   */
  function getFirstTowerCandidates() {
    const candidates = [];


    for (
      let x = -2;
      x <= 2;
      x++
    ) {
      for (
        let y = -2;
        y <= 2;
        y++
      ) {
        const absX =
          Math.abs(x);


        const absY =
          Math.abs(y);


        const touchesByEdge =
          (
            absX === 2 &&
            absY <= 1
          ) ||
          (
            absY === 2 &&
            absX <= 1
          );


        if (
          touchesByEdge
        ) {
          candidates.push({
            x,
            y,
          });
        }
      }
    }


    return candidates;
  }


  /**
   * 2個目以降の移動候補
   *
   * ○ 縦3 / 横0
   * ○ 縦3 / 横1
   * ○ 縦3 / 横2
   * × 縦3 / 横3
   *
   * 3・3は角接触だけになるため不可。
   */
  function getTowerMoveDeltas() {
    const moves = [];


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


        const absX =
          Math.abs(dx);


        const absY =
          Math.abs(dy);


        if (
          absX === 3 &&
          absY === 3
        ) {
          continue;
        }


        moves.push({
          x: dx,
          y: dy,
        });
      }
    }


    return moves;
  }


  const FIRST_TOWER_CANDIDATES =
    getFirstTowerCandidates();


  const TOWER_MOVE_DELTAS =
    getTowerMoveDeltas();


  // ==================================================
  // 推奨ルート
  // ==================================================

  /**
   * 主方向
   *
   * 同距離なら縦優先
   */
  function getMainAxis(
    dx,
    dy
  ) {
    if (
      Math.abs(dy) >=
      Math.abs(dx)
    ) {
      return "y";
    }

    return "x";
  }


  /**
   * 1個目の理想位置
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
   * 2個目以降の理想移動
   *
   * 主方向 最大3
   * 副方向 最大2
   */
  function getIdealNextMove(
    currentX,
    currentY,
    targetX,
    targetY
  ) {
    const remainingX =
      targetX -
      currentX;


    const remainingY =
      targetY -
      currentY;


    const mainAxis =
      getMainAxis(
        targetX,
        targetY
      );


    if (
      mainAxis === "y"
    ) {
      return {
        x:
          clamp(
            remainingX,
            -2,
            2
          ),

        y:
          sign(targetY) * 3,
      };
    }


    return {
      x:
        sign(targetX) * 3,

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
        actualX -
        idealX
      ) +
      Math.abs(
        actualY -
        idealY
      )
    );
  }


  // ==================================================
  // 最短ルート探索
  // ==================================================

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


    // --------------------------------------------------
    // 1個目
    // --------------------------------------------------

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


      const existing =
        layer.get(key);


      if (
        !existing ||
        score < existing.score
      ) {
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
    }


    const maxDepth =
      Math.ceil(
        (
          Math.abs(targetX) +
          Math.abs(targetY)
        ) / 2
      ) +
      20;


    // --------------------------------------------------
    // BFS
    // --------------------------------------------------

    for (
      let depth = 1;
      depth <= maxDepth;
      depth++
    ) {
      const reached = [];


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
          reached.push(node);
        }
      }


      /**
       * 最初に到達した深さ
       * ＝必要最小個数
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
            nextLayer.get(key);


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


  // ==================================================
  // 方向関連
  // ==================================================

  function getDirectionInfo(
    dx,
    dy
  ) {
    const mainAxis =
      getMainAxis(
        dx,
        dy
      );


    let mainDirection;


    if (
      mainAxis === "y"
    ) {
      mainDirection =
        dy > 0
          ? "上"
          : "下";

    } else {
      mainDirection =
        dx > 0
          ? "右"
          : "左";
    }


    let sideDirection =
      null;


    if (
      mainAxis === "y"
    ) {
      if (
        dx > 0
      ) {
        sideDirection =
          "右";

      } else if (
        dx < 0
      ) {
        sideDirection =
          "左";
      }

    } else {
      if (
        dy > 0
      ) {
        sideDirection =
          "上";

      } else if (
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


  // ==================================================
  // 最初の建設案内
  // ==================================================

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
      sideDirection === null
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


  // ==================================================
  // 最終見張り台基準の余裕判定
  // ==================================================

  /**
   * 「目的地の方向へ、あと何マス動かしても
   * 現在の最終見張り台から到達できるか」
   * を調べる。
   *
   * 別ルートは探さない。
   * 実際に表示する推奨ルートだけを見る。
   */
  function getDirectionalSlack(
    finalTower,
    targetX,
    targetY,
    axis,
    direction
  ) {
    let slack = 0;


    /**
     * 到達範囲は最大でも
     * 最終塔の周囲2マスなので、
     * 10回も確認すれば十分。
     */
    for (
      let extra = 1;
      extra <= 10;
      extra++
    ) {
      let testX =
        targetX;


      let testY =
        targetY;


      if (
        axis === "x"
      ) {
        testX +=
          direction * extra;

      } else {
        testY +=
          direction * extra;
      }


      if (
        towerReachesCell(
          finalTower.x,
          finalTower.y,
          testX,
          testY
        )
      ) {
        slack =
          extra;

      } else {
        break;
      }
    }


    return slack;
  }


  function calculateRouteSlack(
    dx,
    dy,
    route
  ) {
    const finalTower =
      route[
        route.length - 1
      ];


    let xSlack =
      null;


    let ySlack =
      null;


    if (
      dx !== 0
    ) {
      xSlack =
        getDirectionalSlack(
          finalTower,
          dx,
          dy,
          "x",
          sign(dx)
        );
    }


    if (
      dy !== 0
    ) {
      ySlack =
        getDirectionalSlack(
          finalTower,
          dx,
          dy,
          "y",
          sign(dy)
        );
    }


    return {
      xSlack,
      ySlack,
    };
  }


  // ==================================================
  // ピッタリ・余裕案内
  // ==================================================

  function buildSlackNotes(
    dx,
    dy,
    route
  ) {
    const {
      mainAxis,
      mainDirection,
    } =
      getDirectionInfo(
        dx,
        dy
      );


    const {
      xSlack,
      ySlack,
    } =
      calculateRouteSlack(
        dx,
        dy,
        route
      );


    const notes = [];


    const mainSlack =
      mainAxis === "x"
        ? xSlack
        : ySlack;


    /**
     * 主方向が限界なら
     * 「ピッタリ」を表示。
     *
     * IR
     * 右4・下7
     * の場合は下方向ピッタリになる。
     */
    if (
      mainSlack === 0
    ) {
      if (
        mainAxis === "x"
      ) {
        notes.push(
          `【強調】${mainDirection}方向にはピッタリ【/強調】` +
          `のため、` +
          `【強調】横方向の建設位置にご注意ください【/強調】。`
        );

      } else {
        notes.push(
          `【強調】${mainDirection}方向にはピッタリ【/強調】` +
          `のため、` +
          `【強調】${mainDirection}方向の建設位置にご注意ください【/強調】。`
        );
      }
    }


    /**
     * 副方向に実際の余裕がある場合のみ表示。
     *
     * 最終見張り台から見て
     * 本当にその方向へ追加で進めるマス数。
     */
    const sideSlack =
      mainAxis === "x"
        ? ySlack
        : xSlack;


    if (
      sideSlack !== null &&
      sideSlack > 0
    ) {
      let sideDirection;


      if (
        mainAxis === "x"
      ) {
        sideDirection =
          dy > 0
            ? "上"
            : "下";

      } else {
        sideDirection =
          dx > 0
            ? "右"
            : "左";
      }


      notes.push(
        `推奨ルートでは、` +
        `【強調】${sideDirection}方向に${sideSlack}マスの余裕【/強調】` +
        `があります。`
      );
    }


    return notes;
  }


  // ==================================================
  // ほぼ直線の案内
  // ==================================================

  function buildStraightNote(
    dx,
    dy
  ) {
    const mainAxis =
      getMainAxis(
        dx,
        dy
      );


    const sideDistance =
      mainAxis === "y"
        ? Math.abs(dx)
        : Math.abs(dy);


    if (
      sideDistance > 2
    ) {
      return null;
    }


    if (
      mainAxis === "y"
    ) {
      const direction =
        dy > 0
          ? "上"
          : "下";


      const text =
        sideDistance === 0
          ? `真${direction}`
          : `概ね真${direction}`;


      return (
        `目的地は` +
        `【強調】${text}【/強調】` +
        `にあるため、` +
        `【強調】左右は大きくずらさなければ問題ありません【/強調】。`
      );
    }


    const text =
      sideDistance === 0
        ? "真横"
        : "概ね真横";


    return (
      `目的地は` +
      `【強調】${text}【/強調】` +
      `のため、` +
      `【強調】上下は大きくずらさなければ問題ありません【/強調】。`
    );
  }


  // ==================================================
  // 途中から直進できるルート
  // ==================================================

  function buildRoutePhaseNotes(
    dx,
    dy,
    route
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


    if (
      sideDirection === null
    ) {
      return [];
    }


    const sideDistance =
      mainAxis === "y"
        ? Math.abs(dx)
        : Math.abs(dy);


    /**
     * 1個目は副方向へ最大1マス。
     * 2個目以降は最大2マスずつ。
     */
    const adjustUntil =
      sideDistance <= 1
        ? 1
        : (
          1 +
          Math.ceil(
            (
              sideDistance -
              1
            ) / 2
          )
        );


    if (
      adjustUntil >
      route.length - 2
    ) {
      return [];
    }


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


    return [
      (
        `【強調】${adjustUntil}個目あたりまで【/強調】は、` +
        `${mainDirection}側に接するように` +
        `【強調】やや${sideDirection}寄り【/強調】` +
        `で建設してください。`
      ),

      (
        `その後は目的地が` +
        `【強調】${straightText}【/強調】` +
        `になるため、` +
        `【強調】${straightText}【/強調】` +
        `に建設していけば到達できます。`
      ),
    ];
  }


  // ==================================================
  // 建設ポイント生成
  // ==================================================

  function buildGuidance(
    dx,
    dy,
    route
  ) {
    const notes = [];


    // ① 最初の建設位置
    notes.push(
      buildStartInstruction(
        dx,
        dy
      )
    );


    // ② ピッタリ・余裕
    notes.push(
      ...buildSlackNotes(
        dx,
        dy,
        route
      )
    );


    // ③ ほぼ直線
    const straightNote =
      buildStraightNote(
        dx,
        dy
      );


    if (
      straightNote
    ) {
      notes.push(
        straightNote
      );

      return notes;
    }


    // ④ 途中からほぼ直進
    notes.push(
      ...buildRoutePhaseNotes(
        dx,
        dy,
        route
      )
    );


    return notes;
  }


  // ==================================================
  // メイン計算
  // ==================================================

  function calculateWatchtowers(
    mapType,
    startX,
    startY,
    destinationX,
    destinationY
  ) {
    const mapSetting =
      MAP_SETTINGS[
        mapType
      ];


    if (
      !mapSetting
    ) {
      throw new Error(
        "マップの種類が正しくありません。"
      );
    }


    const start =
      normalizePoint(
        startX,
        startY,
        mapSetting
      );


    const destination =
      normalizePoint(
        destinationX,
        destinationY,
        mapSetting
      );


    const dx =
      destination.cellX -
      start.cellX;


    const dy =
      destination.cellY -
      start.cellY;


    // --------------------------------------------------
    // 既に接している場合
    // --------------------------------------------------

    if (
      isAlreadyConnected(
        dx,
        dy
      )
    ) {
      return {
        status:
          "already_connected",

        mapType,

        mapName:
          mapSetting.name,

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


    // --------------------------------------------------
    // 最短ルート
    // --------------------------------------------------

    const shortest =
      findShortestRoute(
        dx,
        dy
      );


    // --------------------------------------------------
    // 推奨建築座標
    // --------------------------------------------------

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
                mapSetting.xBoundary
              ),

            y:
              cellIndexToRepresentative(
                absoluteCellY,
                mapSetting.yBoundary
              ),
          };
        }
      );


    // --------------------------------------------------
    // 建設ポイント
    // --------------------------------------------------

    const guidance =
      buildGuidance(
        dx,
        dy,
        shortest.route
      );


    return {
      status:
        "ok",

      mapType,

      mapName:
        mapSetting.name,

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


  // ==================================================
  // HTML側へ公開
  // ==================================================

  window.WatchtowerCalculator = {
    calculate:
      calculateWatchtowers,

    maps:
      MAP_SETTINGS,
  };

})();