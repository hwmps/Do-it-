const {
  UpdateCommand
} = require("@aws-sdk/lib-dynamodb");

class CourseRepository {
  constructor({
    client,
    tableName
  }) {
    if (!client || typeof client.send !== "function") {
      throw new TypeError(
        "client with send() is required"
      );
    }

    if (!tableName) {
      throw new Error(
        "tableName is required"
      );
    }

    this.client = client;
    this.tableName = tableName;
  }

  async upsert(
    course,
    {
      now = new Date().toISOString()
    } = {}
  ) {
    if (!course?.sourceId) {
      throw new Error(
        "course sourceId is required"
      );
    }

    const fields = Object.entries(course)
      .filter(
        ([key, value]) =>
          key !== "sourceId" &&
          value !== undefined
      );

    const names = {
      "#createdAt": "createdAt",
      "#updatedAt": "updatedAt"
    };

    const values = {
      ":createdAt": now,
      ":updatedAt": now
    };

    const assignments = [
      "#createdAt = if_not_exists(#createdAt, :createdAt)",
      "#updatedAt = :updatedAt"
    ];

    fields.forEach(
      ([key, value], index) => {
        const nameKey = `#field${index}`;
        const valueKey = `:value${index}`;

        names[nameKey] = key;
        values[valueKey] = value;

        assignments.push(
          `${nameKey} = ${valueKey}`
        );
      }
    );

    const command = new UpdateCommand({
      TableName: this.tableName,

      Key: {
        sourceId: course.sourceId
      },

      UpdateExpression:
        `SET ${assignments.join(", ")}`,

      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,

      ReturnValues: "ALL_NEW"
    });

    const result =
      await this.client.send(command);

    return result.Attributes || null;
  }
}

module.exports = {
  CourseRepository
};
