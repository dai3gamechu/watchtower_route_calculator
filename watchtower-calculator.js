/**
 * 見張り台 必要数・推奨ルート計算
 *
 * ルール
 * --------------------------------------------------
 * ・1マス = 座標3
 * ・基準境界 X=728 / Y=572
 * ・見張り台1個 = 3×3マス
 * ・新しい見張り台は既存領地と「辺」で接する必要がある
 * ・角だけの接触は不可
 * ・見張り台同士の重なりは可
 * ・目的地は見張り台領地内、または辺で接すれば到達
 * ・最小個数を最優先
 * ・同じ最小個数なら、人間が建設しやすいルートを優先
 */

(() => {
  "use strict";


  // ==================================================
  // 基本設定
  // ==================================================

  const GRID_SIZE = 3;

  const X_BOUNDARY = 728;
  const Y_BOUNDARY = 572;


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


  // ==================================================
  // 到達判定
  // ==================================================

  /**
   * スタート地点と目的地が
   * 同一マス、または既に辺で接しているか
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
   * 見張り台の中心マスから見て、
   * 目的地マスへ到達しているか
   *
   * 3×3内：
   *   |dx| <= 1
   *   |dy| <= 1
   *
   * 辺接触：
   *   |dx| = 2, |dy| <= 1
   *   または
   *   |dy| = 2, |dx| <= 1
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
   * 最初の見張り台
   *
   * スタート地点は1マスのみを
   * 所有領地として扱う。
   *
   * 見張り台の3×3領地が
   * スタートマスと辺接触する位置を列挙。
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
   * 2個目以降の見張り台
   *
   * 3×3同士が辺で接する、
   * または重なる位置。
   *
   * ±3,±3 は角接触のみなので除外。
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
          absX > 3 ||
          absY > 3
        ) {
          continue;
        }


        /**
         * 角だけの接触は不可
         */
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
  // 推奨ルート用
  // ==================================================

  /**
   * 主方向
   *
   * 距離が同じ場合は縦方向優先
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
   * 最初の見張り台の理想位置
   *
   * 主方向：2マス
   * 副方向：最大1マス
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
   * 主方向は3マス進める。
   * 副方向は目的地との差を見て最大2マス調整。
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


  /**
   * 理想移動との差
   */
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
    /**
     * 探索領域。
     *
     * 必要以上に広げると
     * 計算量が増えるため、
     * スタートと目的地の周囲だけを見る。
     */
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
        score <
        existing.score
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


    /**
     * 十分余裕を持った探索上限
     */
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


      /**
       * 現在の個数で
       * 目的地に届いているか
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
          reached.push(node);
        }
      }


      /**
       * このdepthで到達したなら
       * これが最小個数。
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


      // ------------------------------------------------
      // 次の見張り台を展開
      // ------------------------------------------------

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


  function getHorizontalDirection(
    dx
  ) {
    if (
      dx > 0
    ) {
      return "右";
    }

    if (
      dx < 0
    ) {
      return "左";
    }

    return null;
  }


  function getVerticalDirection(
    dy
  ) {
    if (
      dy > 0
    ) {
      return "上";
    }

    if (
      dy < 0
    ) {
      return "下";
    }

    return null;
  }


  // ==================================================
  // 最初の見張り台の案内
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
        if (
          mainDirection === "上"
        ) {
          positionText =
            "真上";

        } else {
          positionText =
            "真下";
        }

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
  // 距離の余裕計算
  // ==================================================

  /**
   * N個の見張り台を使った場合、
   * 1方向へ到達できる理論上の最大距離。
   *
   * 1個目：
   * 中心はスタートから2マス先まで置ける。
   *
   * 2個目以降：
   * 中心を最大3マスずつ進められる。
   *
   * 最後の3×3領地がさらに1マス先まで届く。
   *
   * したがって
   *
   *   2 + (N - 1) × 3 + 1
   * = 3N
   */
  function getMaximumAxisReach(
    towerCount
  ) {
    return (
      towerCount * 3
    );
  }


  /**
   * X・Yそれぞれについて
   * 理論上あと何マス調整余地があるか。
   *
   * 例：
   * 5個なら最大15マス。
   *
   * 下15マス
   * → 15 - 15 = 0
   * → ピッタリ
   *
   * 右10マス
   * → 15 - 10 = 5
   * → 右方向には5マス分の調整余地
   */
  function calculateAxisMargins(
    dx,
    dy,
    towerCount
  ) {
    const maximumReach =
      getMaximumAxisReach(
        towerCount
      );


    return {
      maximumReach,

      xMargin:
        maximumReach -
        Math.abs(dx),

      yMargin:
        maximumReach -
        Math.abs(dy),
    };
  }


  // ==================================================
  // 最終見張り台と目的地の関係
  // ==================================================

  function getFinalApproachInfo(
    finalTower,
    targetX,
    targetY
  ) {
    const dx =
      targetX -
      finalTower.x;


    const dy =
      targetY -
      finalTower.y;


    const absX =
      Math.abs(dx);


    const absY =
      Math.abs(dy);


    /**
     * 目的地が3×3の中
     */
    if (
      absX <= 1 &&
      absY <= 1
    ) {
      return {
        type:
          "inside",

        side:
          null,

        dx,
        dy,
      };
    }


    /**
     * 目的地が右側
     */
    if (
      dx === 2 &&
      absY <= 1
    ) {
      return {
        type:
          "edge",

        side:
          "左",

        dx,
        dy,
      };
    }


    /**
     * 目的地が左側
     */
    if (
      dx === -2 &&
      absY <= 1
    ) {
      return {
        type:
          "edge",

        side:
          "右",

        dx,
        dy,
      };
    }


    /**
     * 目的地が上側
     */
    if (
      dy === 2 &&
      absX <= 1
    ) {
      return {
        type:
          "edge",

        side:
          "下",

        dx,
        dy,
      };
    }


    /**
     * 目的地が下側
     */
    if (
      dy === -2 &&
      absX <= 1
    ) {
      return {
        type:
          "edge",

        side:
          "上",

        dx,
        dy,
      };
    }


    return {
      type:
        "unknown",

      side:
        null,

      dx,
      dy,
    };
  }


  // ==================================================
  // 「ピッタリ」案内
  // ==================================================

  function buildTightAxisNotes(
    dx,
    dy,
    towerCount
  ) {
    const {
      xMargin,
      yMargin,
    } =
      calculateAxisMargins(
        dx,
        dy,
        towerCount
      );


    const notes = [];


    const horizontalDirection =
      getHorizontalDirection(
        dx
      );


    const verticalDirection =
      getVerticalDirection(
        dy
      );


    /**
     * 横方向がピッタリ
     */
    if (
      horizontalDirection &&
      xMargin === 0
    ) {
      notes.push(
        `【強調】${horizontalDirection}方向にはピッタリ【/強調】` +
        `のため、` +
        `【強調】横方向の建設位置にご注意ください【/強調】。`
      );
    }


    /**
     * 縦方向がピッタリ
     */
    if (
      verticalDirection &&
      yMargin === 0
    ) {
      notes.push(
        `【強調】${verticalDirection}方向にはピッタリ【/強調】` +
        `のため、` +
        `【強調】${verticalDirection}方向の建設位置にご注意ください【/強調】。`
      );
    }


    return notes;
  }


  // ==================================================
  // ほぼ直線の場合
  // ==================================================

  function buildStraightRouteNotes(
    dx,
    dy
  ) {
    const absX =
      Math.abs(dx);


    const absY =
      Math.abs(dy);


    const mainAxis =
      getMainAxis(
        dx,
        dy
      );


    const sideDistance =
      mainAxis === "y"
        ? absX
        : absY;


    if (
      sideDistance > 2
    ) {
      return [];
    }


    const notes = [];


    if (
      mainAxis === "y"
    ) {
      const direction =
        dy > 0
          ? "上"
          : "下";


      const positionText =
        sideDistance === 0
          ? `真${direction}`
          : `概ね真${direction}`;


      notes.push(
        `目的地は` +
        `【強調】${positionText}【/強調】` +
        `にあるため、` +
        `【強調】左右は大きくずらさなければ問題ありません【/強調】。`
      );

    } else {
      const positionText =
        sideDistance === 0
          ? "真横"
          : "概ね真横";


      notes.push(
        `目的地は` +
        `【強調】${positionText}【/強調】` +
        `のため、` +
        `【強調】上下は大きくずらさなければ問題ありません【/強調】。`
      );
    }


    return notes;
  }


  // ==================================================
  // 斜めルートの案内
  // ==================================================

  function buildDiagonalRouteNotes(
    dx,
    dy,
    route
  ) {
    const notes = [];


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


    /**
     * 副方向のズレを、
     * 途中までに吸収できるか。
     *
     * 1個目は副方向に最大1マス、
     * その後は1個につき最大2マス程度
     * 調整する推奨ルートを想定。
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


    /**
     * 目的地に到着するかなり前に
     * 副方向の調整が終わる場合。
     */
    if (
      sideDirection &&
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


    /**
     * 最後まで斜め方向を使う場合は、
     * 最終見張り台と目的地の実際の関係を案内。
     */
    const finalTower =
      route[
        route.length - 1
      ];


    const approach =
      getFinalApproachInfo(
        finalTower,
        dx,
        dy
      );


    if (
      approach.type === "edge"
    ) {
      notes.push(
        `最終の見張り台は、` +
        `目的地の` +
        `【強調】${approach.side}側に接する【/強調】` +
        `位置から到達する想定です。`
      );

    } else if (
      approach.type === "inside"
    ) {
      notes.push(
        `最終の見張り台の` +
        `【強調】3×3の領地内に目的地が入る【/強調】` +
        `位置で到達する想定です。`
      );
    }


    return notes;
  }


  // ==================================================
  // 調整余地の案内
  // ==================================================

  /**
   * 「固定2マス」は完全廃止。
   *
   * 実際の必要個数から
   * 各軸の最大到達距離を計算する。
   *
   * ただし、XとYを同時に最大まで
   * 使えるとは限らないため、
   * 「余裕」ではなく
   * 「調整余地」と表現する。
   */
  function buildMarginNote(
    dx,
    dy,
    towerCount
  ) {
    const {
      xMargin,
      yMargin,
    } =
      calculateAxisMargins(
        dx,
        dy,
        towerCount
      );


    const horizontalDirection =
      getHorizontalDirection(
        dx
      );


    const verticalDirection =
      getVerticalDirection(
        dy
      );


    const parts = [];


    if (
      horizontalDirection &&
      xMargin > 0
    ) {
      parts.push(
        `${horizontalDirection}方向に${xMargin}マス`
      );
    }


    if (
      verticalDirection &&
      yMargin > 0
    ) {
      parts.push(
        `${verticalDirection}方向に${yMargin}マス`
      );
    }


    /**
     * 両方向ピッタリなら
     * ここでは何も出さない。
     * ピッタリ案内は別関数で出す。
     */
    if (
      parts.length === 0
    ) {
      return null;
    }


    return (
      `必要な見張り台${towerCount}個で到達できる距離を基準にすると、` +
      `【強調】${parts.join("、")}分の調整余地【/強調】` +
      `があります。`
    );
  }


  // ==================================================
  // 建設のポイント生成
  // ==================================================

  function buildGuidance(
    dx,
    dy,
    route
  ) {
    const towerCount =
      route.length;


    const notes = [];


    /**
     * ① 最初の建設位置
     */
    notes.push(
      buildStartInstruction(
        dx,
        dy
      )
    );


    /**
     * ② ピッタリ方向を優先して案内
     */
    const tightNotes =
      buildTightAxisNotes(
        dx,
        dy,
        towerCount
      );


    notes.push(
      ...tightNotes
    );


    /**
     * ③ ほぼ直線か斜めか
     */
    const absX =
      Math.abs(dx);


    const absY =
      Math.abs(dy);


    const mainAxis =
      getMainAxis(
        dx,
        dy
      );


    const sideDistance =
      mainAxis === "y"
        ? absX
        : absY;


    if (
      sideDistance <= 2
    ) {
      notes.push(
        ...buildStraightRouteNotes(
          dx,
          dy
        )
      );

    } else {
      notes.push(
        ...buildDiagonalRouteNotes(
          dx,
          dy,
          route
        )
      );
    }


    /**
     * ④ 数字としての調整余地
     *
     * 固定2マスではなく
     * 実際の必要個数から計算。
     */
    const marginNote =
      buildMarginNote(
        dx,
        dy,
        towerCount
      );


    if (
      marginNote
    ) {
      notes.push(
        marginNote
      );
    }


    return notes;
  }


  // ==================================================
  // メイン計算
  // ==================================================

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


    // --------------------------------------------------
    // すでに接している場合
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
  };

})();