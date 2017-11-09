



// Euclidean distance




const one_km_in_miles=0.62137;

function degreesToRadians(degrees) {
  return degrees * Math.PI / 180;
}

 /**

  * @param {double} lat1: latitude of first GPS point
  * @param {double} lon1: longitude of first GPS point
  * @param {double} lat2: latitude of second GPS point
  * @param {double} lon2: longitude of second GPS point
  * @return {double}: return distance between two GPS points in KM
  */
 function distanceInKmBetweenEarthCoordinates(lat1, lon1, lat2, lon2) {
   var earthRadiusKm = 6371;

   var dLat = degreesToRadians(lat2-lat1);
   var dLon = degreesToRadians(lon2-lon1);

   lat1 = degreesToRadians(lat1);
   lat2 = degreesToRadians(lat2);

   var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
           Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
   var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
   return earthRadiusKm * c;
 }

 /**

  * @param {double} lat1: latitude of first GPS point
  * @param {double} lon1: longitude of first GPS point
  * @param {double} lat2: latitude of second GPS point
  * @param {double} lon2: longitude of second GPS point
  * @return {double}: return distance between two GPS points in miles
  */
 function distanceInMilesBetweenEarthCoordinates(lat1, lon1, lat2, lon2) {
   return distanceInKmBetweenEarthCoordinates(lat1, lon1, lat2, lon2)*one_km_in_miles;
 }

 /**
  * @param {integer} i: the index of first point
  * @param {integer} j: the index of the second point
  * @return {string}: a unique string denoting the index of the combo where the smaller index is always put ahead of the bigger one
  */

function createDistanceMapIndex(i, j)
{
  return i>j?(j+ "-"+ i):(i+ "-"+ j );
}

function isNull(item)
{
  return (item===null || typeof(item)=="undefined")
}



/**
* @param {array} dataset: an array of points, each point is shaped as [lat lon];
* @param {integer} eps: the radius of the cluster
* @param {string} eps_unit: in either "km" or "mi"
* @param {integer} minPts: the minimal number of points in a cluster
*/
module.exports=function(dataset, eps, eps_unit="km", minPts)
{
    var external={};
    var internal={};
    var distance_map={

    };
    var labeled_points={

    }
    var noise_points={

    };

    var dist=null;

    internal.calculateDistance=function(point1, point2)
    {
      if(isNull(point1) || isNull(point2))
      {
        throw "missing one of the points";
      }
      var index=createDistanceMapIndex(point1, point2);
      if(isNull(distance_map[index]))
      {
        var distance=dist(dataset[point1][1], dataset[point1][0],dataset[point2][1], dataset[point2][0] );
            distance_map[index]=distance;
            return distance;
      }
      return distance_map[index];
    }

    internal.queryCluster=function(point, excluded)
    {
      var cluster=[];
      for(var i=0;i<dataset.length;i++)
      {
        if(point==i || i==excluded)
        {
          continue;
        }
        else {
          if(internal.calculateDistance(point, i)<=eps)
          {
            cluster.push(i);
          }
        }

      }
      return cluster;
    }

    internal.expandCluster=function(center, cluster, cluster_index)
    {
      for(var i=0;i<cluster.length;i++)
      {
        if(noise_points[cluster[i]])
        {
          delete noise_points[cluster[i]]
        }

        if(labeled_points[cluster[i]])
        {
          continue;
        }
        else {
          labeled_points[cluster[i]]=cluster_index;
        }
        var subCluster=internal.queryCluster(cluster[i], center);

        if(subCluster.length>=minPts)
        {
          for(var z=0;z<subCluster.length;z++)
          {
            var found=false;
            for(var j=0;j<cluster.length;j++)
            {
              if(cluster[j]==subCluster[z])
              {
                found=true;
                break;
              }
            }
            if(!found)
            {
              cluster.push(subCluster[z]);
            }
          }
        }
      }

    }

    /**
    * @callback {function} callback: (error, clusters):
                          error is a string describing the error,
                          clusters is an array of clusters; each cluster is another array of points with index coorresponding to the index in the input dataset
    */
    external.fit=function(callback)
    {

      if(!callback)
      {
        throw "no callback function found...";
      }
      if(!Number.isInteger(minPts))
      {
        callback("minPts is not a valid integer.", null);
        return;
      }
      if(minPts==0)
      {
        callback("minPts must be bigger than zero.", null);
        return;
      }
      if(isNaN(eps) || eps<=0)
      {
        callback("Invalid eps", null);
        return;
      }

      if(dataset.length==0)
      {
        callback("Need at least one point in the dataset", null);
        return;
      }
      if(dataset.length<minPts)
      {
        callback("not enough points in the dataset to form a cluster", null);
        return;
      }
      if(!eps_unit)
      {
        eps_unit="km"
      }
      eps_unit=eps_unit.toLowerCase().trim();
      if(eps_unit!="km" && eps_unit!="mi")
      {
        callback("Invalid eps unit; it must be either 'km' or 'mi'. ", null);
        return;
      }
      if(eps_unit=="km")
      {
        dist=distanceInKmBetweenEarthCoordinates;
      }
      else {
        dist=distanceInMilesBetweenEarthCoordinates;
      }

      var cluster_index=0;
      for(var i=0;i<dataset.length;i++)
      {
        if(!isNull(noise_points[i]) || !isNull(labeled_points[i])) // the point is already labeled as noise or has been labeled in another cluster
        {
          continue;
        }
        var cluster=internal.queryCluster(i, i);
        if(cluster.length<minPts)
        {
          noise_points[i]=true;
          continue;
        }
        else {
          labeled_points[i]=cluster_index;
          internal.expandCluster(i, cluster, cluster_index);
          cluster_index++;
        }

      }
      var clusters=[]

      for (var data_point in labeled_points) {
          if (labeled_points.hasOwnProperty(data_point)) {
              if(isNull(clusters[ labeled_points[data_point]  ]))
              {
                clusters[ labeled_points[data_point]  ]=[Number(data_point)];
              }
              else {
                clusters[ labeled_points[data_point]  ].push(Number(data_point));
              }
          }
      }
      callback(null, clusters);



    }

    return external;
}
