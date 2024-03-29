var db=require('../config/connection')
var collection=require('../config/collections')
const bcrypt=require('bcrypt')
const { response } = require('express')
const { ObjectId, ObjectID } = require('mongodb')
var objectId=require('mongodb').ObjectID
const Razorpay=require('razorpay')
const { resolve } = require('path')
//Razorpay instance
var instance = new Razorpay({
    key_id: 'rzp_test_q5tWUc2IufhANY',
    key_secret: 'txyTxITBBXs6MKyn9CG2kPGa',
  });
module.exports={
    doSignup:(userData)=>{
        return new Promise(async(resolve,reject)=>{
            userData.Password=await bcrypt.hash(userData.Password,10)
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data)=>{
                resolve(data.ops[0])
            })
               
        })
        
    },
    doLogin:(userData)=>{
        return new Promise(async(resolve,reject)=>{
            let loginStatus=false
            let response={}
            let user=await db.get().collection(collection.USER_COLLECTION).findOne({Email:userData.Email})
            if(user){
                bcrypt.compare(userData.Password,user.Password).then((status)=>{
                    if(status){
                        console.log("login success");
                        response.user=user
                        response.status=true
                        resolve(response)
                    }else{
                        console.log('login failed');
                        resolve({status:false})
                    }
                })
            }else{
                console.log('login failed');
                resolve({status:false})
            }
        })
    },
    addToCart:(proId,userId)=>{
        let proObj={
            item:ObjectId(proId),
            Quantity:1
        }
        return new Promise(async(resolve,reject)=>{
            let userCart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
            if(userCart){
                let proExist=userCart.products.findIndex(product=> product.item==proId)
                console.log(proExist);
                if(proExist!=-1){
                    db.get().collection(collection.CART_COLLECTION)
                    .updateOne({user:objectId(userId),'products.item':objectId(proId)},
                    {
                        $inc:{'products.$.Quantity':1}
                    }
                    ).then(()=>{
                        resolve()
                    })
                }else{
                db.get().collection(collection.CART_COLLECTION)
               .updateOne({user:objectId(userId)},
                    {
                       
                     $push:{products:proObj}
                        
                }
                ).then((response)=>{
                   resolve()
               })
            }
            }else{
                let cartobj={
                    user:objectId(userId),
                    products:[proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartobj).then((response)=>{
                    resolve()
                })
            }
        })
    },
    getCartProducts:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cartItems=await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match:{user:objectId(userId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.Quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                }
                //  {
                //      $lookup:{
                //          from:collection.PRODUCT_COLLECTION,
                //          let:{prodList:'$products'},
                //          pipeline:[
                //              {
                //                 $match:{
                //                     $expr:{
                //                         $in:['$_id',"$$prodList"]
                //                      }
                //                }
                //             }
                //          ],
                //          as:'cartItems'
                //      }
                // }
            ]).toArray()
            
            resolve(cartItems)
        })
    },
    getCartCount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let count=0
            let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
            if(cart){
                count=cart.products.length
            }
            resolve(count)
        })
    },
    changeProductQuantity:(details)=>{
        details.count=parseInt(details.count)
        details.quantity=parseInt(details.quantity)
        
        return new Promise((resolve,reject)=>{
            if(details.count==-1 && details.Quantity==1){
                db.get().collection(collection.CART_COLLECTION).updateOne({_id:objectId(details.cart)},
                    
                
                {
                    $pull:{products:{item:objectId(details.product)}}
                }
                ).then((response)=>{
                    resolve({removeProduct:true})
                })
            }else{
            db.get().collection(collection.CART_COLLECTION)
                    .updateOne({_id:objectId(details.cart),'products.item':objectId(details.product)},
                    {
                        $inc:{'products.$.Quantity':details.count}
                    }
                    ).then((response)=>{

                        resolve({status:true})
                    })
                }
        })
    },
    //all products removed
    // removeProduct:(proId)=>{
    //     return new Promise((resolve,reject)=>{
    //          //console.log(objectId(proId));
    //          db.get().collection(collection.PRODUCT_COLLECTION).removeOne({_id:objectId(proId)}).then((response)=>{
    //             //console.log(response);
    //             console.log(response);
    //            resolve(response)
    //         })
    //     })
    //  }
    //all products removed 
    // getTotalAmount:(userId)=>{
    //     return new Promise(async(resolve, reject)=>{
    //         let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
    //             {
    //                 $match:{user:objectId(userId)}
    //             },
    //             {
    //                 $unwind:'$products'
    //             },
    //             {
    //                 $project:{
    //                     item:'$products.item',
    //                     quantity:'$products.quantity',
                        
    //                 }
    //             },
    //             {
    //                 $lookup:{
    //                     from:collection.PRODUCT_COLLECTION,
    //                     localField:'item',
    //                     foreignField:'_id',
    //                     as:'product'
    //                 }
    //             },
    //             {
    //                 $project:{
    //                     item:1, 
    //                     quantity:1,
    //                     product:{ $arrayElemAt: ['$products',0]} 
    //                 }
    //             },
    //              { $addFields: {
    //             convertprice: {$toInt:"$products.Price" }       
    //          }
                
    //         },
    //             {   
    //                 $group:{
    //                     _id:null,
    //                     total:{$sum:{$multiply:['$quantity', '$convertprice']}}
    //                 }
    //             },
                
                
                
    //         ]).toArray()
    //         //console.log(total[0].total);
    //         resolve(total[0].total);
    //     })
    // },

    getTotalAmount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let total=await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match:{user:objectId(userId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.Quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                },
                {  $addFields:{
                     convertprice: {$toInt: "$product.Price"}
                    }
                },
                {
                    $group:{
                        _id:null,
                        total:{$sum:{$multiply:['$quantity','$convertprice']}}
                    }
                }
                
                
            ]).toArray()
            //console.log(total[0].total);
            resolve(total[0].total)
        })
    
    },


    placeOrder:(order,products,total)=>{
        return new Promise((resolve,reject)=>{
            console.log(order,products,total);
            let status=order['payment-method']==='COD'?'placed':'pending'
            let orderObj={
                deliveryDeatils:{
                    mobile:order.mobile,
                    address:order.address,
                    pincode:order.pincode
                    
                },
                userId:objectId(order.userId),
                paymentMethod:order['payment-method'],
                products:products,
                totalAmount:total,
                status:status,
                date:new Date()
            }

            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
                db.get().collection(collection.CART_COLLECTION).removeOne({user:objectId(order.userId)})
                resolve(response.ops[0]._id)
            })
            
        })
    },
    getCartProductList:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            console.log(userId);
            let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
            console.log(cart);
            resolve(cart.products)

        })
    },

    getUserOrders:(userId)=>{
        return new Promise(async(resolve, reject) => {
            let orders = await db.get().collection(collection.ORDER_COLLECTION)
            .find({userId:objectId(userId)}).toArray()
            console.log('order:',orders);
            resolve(orders)
        })
        
    },

    getOrderProducts:(productId)=>{
        return new Promise(async(resolve, reject)=>{
            let orderItem = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match:{_id:objectId(productId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1, quantity:1,product:{ $arrayElemAt: ['$product',0]}
                    }
                }
                
                
            ]).toArray()
            console.log(orderItem);
            resolve(orderItem)
        })
    },
    generateRazorpay:(orderId,total)=>{
        return new Promise((resolve,reject)=>{
            var options = {
                amount: total*100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: ""+orderId
              };
              instance.orders.create(options, function(err, order) {
                  if(err){
                      console.log(err);
                  }else{

                  
                console.log("New order:",order);
                resolve(order)
                  }
              });
        })
    },
    verifyPayment:(details)=>{
        return new Promise((resolve,reject)=>{
            const crypto = require('crypto');
            let hmac = crypto.createHmac('sha256', 'txyTxITBBXs6MKyn9CG2kPGa')

            hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]']);
            hmac=hmac.digest('hex')
            if(hmac==details['payment[razorpay_signature]']){
                resolve()
            }else{
                reject()
            }
        })
    },
    changePaymentStatus:(orderId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION)
            .updateOne({_id:objectId(orderId)},
            {
                $set:{
                    status:'placed'
                }
            }
            ).then(()=>{
                resolve()
            })
        })
    }
}